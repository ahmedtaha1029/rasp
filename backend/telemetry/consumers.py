"""
telemetry/consumers.py

StageEngine.evaluate() now reads passing_conditions, fail_conditions,
and partial_credit_events from the vector's detection_criteria JSONB instead
of using hardcoded scoring (flag=1.0, delete=0.5, click=0.0).

Added HOVER action type support and dwell-time telemetry handling.

Partial credit is now returned as an explicit categorical outcome.

The detection_criteria JSON structure (from spec 3.2):
  {
    "target_elements": ["phishing-link", "attachment-download"],
    "passing_conditions": [
      {"action": "flag", "element": "phishing-link"},
      {"action": "delete", "after": "hover"}
    ],
    "fail_conditions": [
      {"action": "click", "element": "phishing-link"},
      {"action": "download"}
    ],
    "partial_credit_events": [
      {"action": "delete"},
      {"action": "flag", "without_reason": true}
    ],
    "time_pressure_ms": 60000,
    "indicators": ["Spoofed domain: linkedln.com", "Urgency language"],
    "best_practice": "Always hover over links to verify the actual URL...",
    "mitre_description": "Spearphishing Link"
  }
"""

import json
import logging
from typing import Any

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .serializers import EventLogInboundSerializer

logger = logging.getLogger(__name__)


class TelemetryConsumer(AsyncWebsocketConsumer):

    async def connect(self) -> None:
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"session_{self.session_id}"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        session = await self._get_session()
        if not session:
            await self.close(code=4004)
            return

        self.session = session
        self.role_at_time = self.user.role

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code: int) -> None:
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data: str = None, bytes_data=None) -> None:
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_error("Invalid JSON.")
            return

        serializer = EventLogInboundSerializer(data=payload)
        if not serializer.is_valid():
            await self._send_error(serializer.errors)
            return

        validated = serializer.validated_data
        stage_id = payload.get("stage_id")
        action_id = payload.get("action_id")
        selected_reasons = payload.get("selected_reason_indices", [])

        if not stage_id:
            await self._send_error("stage_id is required.")
            return

        # Fix #10: HOVER events are recorded but don't create new UserActions
        if validated["event_type"] == "hover":
            await self._save_hover_event(
                stage_id=stage_id,
                offset_ms=validated["offset_ms"],
                element=validated["element"],
            )
            return  # No scoring for pure hover events

        user_action = await self._get_or_create_user_action(
            stage_id=stage_id,
            action_id=action_id,
            action_type=validated["event_type"],
        )
        if not user_action:
            await self._send_error("Stage not found.")
            return

        await self._save_event_log(
            action=user_action,
            event_type=validated["event_type"],
            offset_ms=validated["offset_ms"],
            element=validated["element"],
        )

        feedback = await self._evaluate_detection(
            user_action=user_action,
            stage_id=stage_id,
            offset_ms=validated["offset_ms"],
            element=validated["element"],
            selected_reasons=selected_reasons,
        )

        if feedback.get("stage_complete"):
            stage_info = await self._get_stage_info(stage_id)
            feedback["session_complete"] = stage_info["is_last_stage"]
            feedback["current_stage_order"] = stage_info["current_stage_order"]
            feedback["total_stages"] = stage_info["total_stages"]
        else:
            feedback["session_complete"] = False
            feedback["current_stage_order"] = None
            feedback["total_stages"] = None

        await self.send(text_data=json.dumps(feedback))
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "session_feedback", "feedback": feedback},
        )

    async def session_ready(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            "event": "session_ready",
            "base_url": event["base_url"],
            "session_id": event["session_id"],
        }))

    async def session_failed(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            "event": "provisioning_failed",
            "reason": event.get("reason", "Unknown error"),
        }))

    async def session_feedback(self, event: dict) -> None:
        await self.send(text_data=json.dumps({
            "type": "detection_feedback",
            **event["feedback"],
        }))

    @sync_to_async
    def _get_session(self):
        from simulations.models import SimulationSession
        try:
            return SimulationSession.objects.get(
                id=self.session_id,
                user=self.user,
                status=SimulationSession.Status.ACTIVE,
            )
        except SimulationSession.DoesNotExist:
            return None

    @sync_to_async
    def _get_or_create_user_action(self, stage_id, action_id, action_type):
        from scenarios.models import Stage
        from telemetry.models import UserAction

        if action_id:
            try:
                return UserAction.objects.get(pk=action_id, session=self.session)
            except UserAction.DoesNotExist:
                pass

        try:
            stage = Stage.objects.get(pk=stage_id, scenario=self.session.scenario)
        except Stage.DoesNotExist:
            return None

        return UserAction.objects.create(
            session=self.session,
            stage=stage,
            role_at_time=self.role_at_time,
            action_type=action_type,
        )

    @sync_to_async
    def _save_event_log(self, action, event_type, offset_ms, element):
        from telemetry.models import EventLog
        EventLog.objects.create(
            action=action,
            event_type=event_type,
            offset_ms=offset_ms,
            element=element,
        )

    @sync_to_async
    def _save_hover_event(self, stage_id, offset_ms, element):
        """
        Fix #10: Save hover events to EventLog for dwell-time analysis.
        Hover events are linked to the most recent UserAction for this stage/session,
        or stored as standalone EventLog rows (without action FK) for hesitation analysis.
        We attach to the latest action if one exists for this stage.
        """
        from telemetry.models import EventLog, UserAction
        try:
            last_action = UserAction.objects.filter(
                session=self.session,
                stage_id=stage_id,
            ).order_by("-created_at").first()

            if last_action:
                EventLog.objects.create(
                    action=last_action,
                    event_type="hover",
                    offset_ms=offset_ms,
                    element=element,
                )
        except Exception as exc:
            logger.warning("[telemetry] hover save failed: %s", exc)

    @sync_to_async
    def _evaluate_detection(self, user_action, stage_id, offset_ms, element, selected_reasons):
        return StageEngine.evaluate(
            user_action=user_action,
            stage_id=stage_id,
            offset_ms=offset_ms,
            element=element,
            selected_reasons=selected_reasons,
        )

    @sync_to_async
    def _get_stage_info(self, stage_id: str) -> dict:
        from scenarios.models import Stage
        try:
            stage = Stage.objects.select_related("scenario").get(pk=int(stage_id))
            total_stages = stage.scenario.stages.count()
            is_last = stage.stage_order >= total_stages
            return {
                "is_last_stage": is_last,
                "current_stage_order": stage.stage_order,
                "total_stages": total_stages,
            }
        except Exception as exc:
            logger.error("TelemetryConsumer._get_stage_info error: %s", exc)
            return {"is_last_stage": False, "current_stage_order": 1, "total_stages": 1}

    async def _send_error(self, detail: Any) -> None:
        await self.send(text_data=json.dumps({"error": detail}))


# ===========================================================================
# StageEngine — Fix #9: Dynamic JSONB criteria evaluation
# ===========================================================================

class StageEngine:
    """
    Scores user actions against the attack vector's detection_criteria JSONB.

    Fix #9: Replaced hardcoded scoring matrix with a configurable rule engine
    that reads passing_conditions, fail_conditions, and partial_credit_events
    from the vector's detection_criteria JSON.

    Fix #15: Returns an explicit detection_status field:
      "detected"  — passing_condition matched
      "partial"   — partial_credit_event matched
      "missed"    — fail_condition matched or no matching condition
    """

    CONCLUSIVE_ACTIONS = {"click", "download", "reply", "forward", "delete", "flag", "submit"}

    @staticmethod
    def evaluate(user_action, stage_id, offset_ms, element, selected_reasons=None):
        from scenarios.models import AttackVector
        from telemetry.models import EventLog

        if selected_reasons is None:
            selected_reasons = []

        vectors = list(AttackVector.objects.filter(stage_id=stage_id).values(
            "detection_criteria", "mitre_id", "vector_type",
        ))

        if not vectors:
            return StageEngine._no_vector_feedback(user_action.action_type)

        # Find the matching vector by target_elements
        matched_vector = None
        for v in vectors:
            criteria = v.get("detection_criteria") or {}
            if element in criteria.get("target_elements", []):
                matched_vector = v
                break

        # Fallback: any element matches if no target_elements specified
        if not matched_vector and vectors:
            matched_vector = vectors[0]

        if not matched_vector:
            return StageEngine._neutral_feedback(element)

        criteria = matched_vector.get("detection_criteria") or {}
        action_type = user_action.action_type

        # ── Retrieve hover history for this action (dwell time) ───────────
        hover_events = list(EventLog.objects.filter(
            action__session=user_action.session,
            action__stage_id=stage_id,
            event_type="hover",
            element=element,
        ).values_list("offset_ms", flat=True))
        has_prior_hover = len(hover_events) > 0

        # ── Evaluate detection_criteria rules (Fix #9) ────────────────────
        quality, detected, detection_status = StageEngine._evaluate_rules(
            criteria=criteria,
            action_type=action_type,
            element=element,
            selected_reasons=selected_reasons,
            has_prior_hover=has_prior_hover,
            indicators=criteria.get("indicators", []),
        )

        # ── Time pressure penalty ─────────────────────────────────────────
        time_pressure_ms = criteria.get("time_pressure_ms", 60_000)
        time_penalty = detected and offset_ms > time_pressure_ms and quality > 0.2
        if time_penalty:
            quality = round(quality - 0.2, 1)

        points = round(quality * 100)

        # ── Persist outcome ───────────────────────────────────────────────
        from telemetry.models import UserAction
        UserAction.objects.filter(pk=user_action.pk).update(
            detected=detected,
            detection_quality=quality,
            time_to_detect=(offset_ms if detected else None),
        )

        # ── Build feedback text ───────────────────────────────────────────
        indicators = criteria.get("indicators", [])
        best_practice = criteria.get("best_practice", "Always verify before acting.")
        mitre_id = matched_vector.get("mitre_id", "")
        mitre_description = criteria.get("mitre_description", "")

        result_label, explanation, indicators_missed = StageEngine._build_feedback(
            detection_status=detection_status,
            action_type=action_type,
            element=element,
            indicators=indicators,
            time_penalty=time_penalty,
            quality=quality,
        )

        stage_complete = action_type in StageEngine.CONCLUSIVE_ACTIONS

        return {
            "detected": detected,
            "detection_quality": quality,
            "detection_status": detection_status,   # Fix #15: explicit categorical
            "points": points,
            "time_to_detect_ms": offset_ms if detected else None,
            "result_label": result_label,
            "explanation": explanation,
            "indicators_missed": indicators_missed,
            "best_practice": best_practice,
            "mitre_id": mitre_id,
            "mitre_description": mitre_description,
            "recommended_difficulty": StageEngine._recommend_difficulty(quality),
            "time_penalty": time_penalty,
            "stage_complete": stage_complete,
        }

    @staticmethod
    def _evaluate_rules(criteria, action_type, element, selected_reasons, has_prior_hover, indicators):
        """
        Fix #9: Evaluate action against JSONB passing/fail/partial rules.

        Rule condition keys supported:
          action       — required; must match action_type
          element      — optional; must match element if specified
          after        — optional; "hover" means has_prior_hover must be True
          without_reason — if True, flag with no correct reason selected
          with_reason    — if True, flag with at least one correct reason

        Returns: (quality: float, detected: bool, detection_status: str)
        """
        passing_conditions  = criteria.get("passing_conditions",  [])
        fail_conditions     = criteria.get("fail_conditions",     [])
        partial_credit_events = criteria.get("partial_credit_events", [])

        # If no JSONB rules are defined, fall back to the legacy scoring matrix
        if not passing_conditions and not fail_conditions and not partial_credit_events:
            return StageEngine._legacy_score(action_type, selected_reasons, indicators)

        def condition_matches(cond: dict) -> bool:
            if cond.get("action") and cond["action"] != action_type:
                return False
            if cond.get("element") and cond["element"] != element:
                return False
            if cond.get("after") == "hover" and not has_prior_hover:
                return False
            if cond.get("with_reason") and not bool(selected_reasons):
                return False
            if cond.get("without_reason") and bool(selected_reasons):
                return False
            return True

        # Check passing conditions first
        for cond in passing_conditions:
            if condition_matches(cond):
                return 1.0, True, "detected"

        # Check partial credit
        for cond in partial_credit_events:
            if condition_matches(cond):
                return 0.5, True, "partial"

        # Check fail conditions
        for cond in fail_conditions:
            if condition_matches(cond):
                return 0.0, False, "missed"

        # Default: non-listed action on a target element = miss
        return 0.0, False, "missed"

    @staticmethod
    def _legacy_score(action_type, selected_reasons, indicators):
        """
        Legacy scoring matrix used when no JSONB rules are defined.
        Maintains backwards compatibility with existing vectors.
        """
        if action_type in {"click", "download", "reply", "forward"}:
            return 0.0, False, "missed"
        elif action_type == "delete":
            return 0.5, True, "partial"
        elif action_type == "flag":
            has_correct_reason = bool(selected_reasons) and any(
                0 <= i < len(indicators) for i in selected_reasons
            )
            quality = 1.0 if has_correct_reason else 0.8
            status = "detected" if has_correct_reason else "partial"
            return quality, True, status
        return 0.0, False, "missed"

    @staticmethod
    def _build_feedback(detection_status, action_type, element, indicators, time_penalty, quality):
        if detection_status == "missed":
            result_label = "Attack Missed"
            explanation = (
                f"You {action_type}ed the element '{element}'. "
                "This would have compromised your device or data."
            )
            indicators_missed = indicators
        elif detection_status == "partial":
            tip = " (took too long)" if time_penalty else ""
            if action_type == "delete":
                result_label = "Email Deleted — Partial Credit"
                explanation = (
                    "Good instinct — you avoided the threat. "
                    "Next time, use 'Flag as Suspicious' so the security team is notified."
                )
            else:
                result_label = f"Partial Detection{tip}"
                explanation = (
                    f"You identified the threat{tip}, but didn't pinpoint the specific red flag. "
                    "Try to name exactly what made it suspicious."
                )
            indicators_missed = indicators
        else:  # detected
            if time_penalty:
                result_label = "Threat Detected — Slow Response"
                explanation = "You detected the threat but it took longer than expected. Speed matters in real attacks."
            else:
                result_label = "Threat Detected — Full Marks"
                explanation = "Excellent! You correctly identified and reported the attack indicator."
            indicators_missed = []

        return result_label, explanation, indicators_missed

    @staticmethod
    def _recommend_difficulty(quality):
        """Fix: Multi-threshold recommendation."""
        if quality >= 1.0:
            return "intermediate"
        if quality >= 0.8:
            return "intermediate"
        if quality >= 0.5:
            return None  # stay at current level
        return "basic"

    @staticmethod
    def _no_vector_feedback(action_type: str = "view"):
        if action_type == "flag":
            return {
                "detected": False, "detection_quality": 0.0, "detection_status": "missed",
                "points": 0, "time_to_detect_ms": None, "result_label": "False Alarm",
                "explanation": "You flagged this interaction, but there was nothing malicious here. This was a trust-building touchpoint.",
                "indicators_missed": [], "best_practice": "Before flagging, look for concrete red flags.",
                "mitre_id": "", "mitre_description": "", "recommended_difficulty": None,
                "time_penalty": False, "stage_complete": True,
            }
        if action_type == "delete":
            return {
                "detected": False, "detection_quality": 0.0, "detection_status": "missed",
                "points": 0, "time_to_detect_ms": None, "result_label": "Unnecessary Deletion",
                "explanation": "You deleted this message, but it contained nothing malicious.",
                "indicators_missed": [], "best_practice": "Reserve deletion for clearly malicious messages.",
                "mitre_id": "", "mitre_description": "", "recommended_difficulty": None,
                "time_penalty": False, "stage_complete": True,
            }
        return {
            "detected": None, "detection_quality": None, "detection_status": "neutral",
            "points": None, "time_to_detect_ms": None, "result_label": "Awareness Stage",
            "explanation": "This stage represents a trust-building interaction — no active attack was present.",
            "indicators_missed": [], "best_practice": "Not every stage contains an obvious threat. Stay alert in later stages.",
            "mitre_id": "", "mitre_description": "", "recommended_difficulty": None,
            "time_penalty": False, "stage_complete": True,
        }

    @staticmethod
    def _neutral_feedback(element):
        return {
            "detected": False, "detection_quality": 0.0, "detection_status": "neutral",
            "points": 0, "time_to_detect_ms": None, "result_label": "Non-Attack Interaction",
            "explanation": f"'{element}' is not part of an attack vector.",
            "indicators_missed": [], "best_practice": "Focus on suspicious elements.",
            "mitre_id": "", "mitre_description": "", "recommended_difficulty": None,
            "time_penalty": False, "stage_complete": False,
        }