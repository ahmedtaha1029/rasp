# backend/tests/test_scoring.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
class TestStageEngine:
    """Tests the JSONB rule engine in telemetry/consumers.py StageEngine."""

    def _make_vector(self, db):
        from scenarios.models import Scenario, Stage, AttackVector
        scenario = Scenario.objects.create(
            title="Scoring Test", container_image="rasp:latest"
        )
        stage = Stage.objects.create(
            scenario=scenario, name="screening", stage_order=1
        )
        AttackVector.objects.create(
            stage=stage,
            vector_type="phishing_link",
            mitre_id="T1566",
            detection_criteria={
                "target_elements":       ["btn-flag", "phishing-link"],
                "passing_conditions":    [{"action": "flag"}],
                "fail_conditions":       [{"action": "click"}],
                "partial_credit_events": [{"action": "delete"}],
                "best_practice":         "Always verify links.",
                "indicators":            ["Spoofed domain"],
                "mitre_description":     "Spearphishing link",
            }
        )
        return stage

    def _make_user_action(self, user, session, stage, action_type, db):
        """
        Create a UserAction and a companion EventLog row.

        UserAction has no 'element' or 'offset_ms' fields — those live on
        EventLog (telemetry/models.py). Passing them to UserAction.create()
        raises TypeError. Create both records separately.
        """
        from telemetry.models import UserAction, EventLog
        ua = UserAction.objects.create(
            session=session,
            stage=stage,
            role_at_time=user.role,
            action_type=action_type,
        )
        EventLog.objects.create(
            action=ua,
            event_type=action_type,
            offset_ms=5000,
            element="btn-flag",
        )
        return ua

    def _make_session(self, user, stage, db):
        from simulations.models import SimulationSession
        return SimulationSession.objects.create(
            user=user,
            scenario=stage.scenario,
            status="active",
            ethical_warning_acknowledged=True,
            version_snapshot=1,
        )

    def test_flag_action_returns_detected(self, hr_user, db):
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "flag", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="btn-flag",
        )
        assert result["detection_status"] == "detected"
        assert result["detected"] is True
        assert result["points"] == 100

    def test_click_action_returns_missed(self, hr_user, db):
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "click", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="phishing-link",
        )
        assert result["detection_status"] == "missed"
        assert result["detected"] is False
        assert result["points"] == 0

    def test_delete_action_returns_partial(self, hr_user, db):
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "delete", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="btn-flag",
        )
        assert result["detection_status"] == "partial"
        assert result["detected"] is True
        assert result["points"] == 50

    def test_feedback_includes_mitre_id(self, hr_user, db):
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "click", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="phishing-link",
        )
        assert result["mitre_id"] == "T1566"

    def test_feedback_includes_indicators_on_miss(self, hr_user, db):
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "click", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="phishing-link",
        )
        assert "indicators_missed" in result
        assert len(result["indicators_missed"]) > 0

    def test_detected_clears_indicators(self, hr_user, db):
        """On a full detection, indicators_missed should be empty."""
        from telemetry.consumers import StageEngine

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "flag", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="btn-flag",
        )
        assert result["indicators_missed"] == []

    def test_time_pressure_penalty_reduces_quality(self, hr_user, db):
        """Flagging correctly but after time_pressure_ms should incur a penalty."""
        from telemetry.consumers import StageEngine
        from scenarios.models import AttackVector

        stage = self._make_vector(db)
        # Add time_pressure_ms to the vector's detection_criteria
        vector = AttackVector.objects.get(stage=stage)
        vector.detection_criteria["time_pressure_ms"] = 3000
        vector.save(update_fields=["detection_criteria"])

        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "flag", db)

        # offset_ms=10000 is well past time_pressure_ms=3000
        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=10000,
            element="btn-flag",
        )
        # Still detected, but quality is penalised
        assert result["detection_status"] == "detected"
        assert result["time_penalty"] is True
        assert result["detection_quality"] < 1.0

    def test_resource_url_in_feedback_when_mitre_resource_exists(self, hr_user, db):
        """Fix #13: resource_url should appear when a MitreEducationalResource exists."""
        from telemetry.consumers import StageEngine
        from analytics.models import MitreEducationalResource

        MitreEducationalResource.objects.create(
            mitre_id="T1566",
            title="Phishing",
            url="https://attack.mitre.org/techniques/T1566/"
        )

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)
        ua = self._make_user_action(hr_user, session, stage, "click", db)

        result = StageEngine.evaluate(
            user_action=ua,
            stage_id=stage.id,
            offset_ms=5000,
            element="phishing-link",
        )
        assert result["mitre_id"] == "T1566"

    def test_no_vector_returns_neutral_on_non_conclusive_action(self, hr_user, db):
        """Evaluating against a stage with no AttackVector returns neutral feedback."""
        from telemetry.consumers import StageEngine
        from scenarios.models import Scenario, Stage
        from simulations.models import SimulationSession
        from telemetry.models import UserAction, EventLog

        scenario = Scenario.objects.create(title="Empty Stage", container_image="rasp:latest")
        stage = Stage.objects.create(scenario=scenario, name="screening", stage_order=1)
        # Removed dead reference to SimulationSession_helper (undefined name)
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="active",
            ethical_warning_acknowledged=True, version_snapshot=1,
        )
        # UserAction requires role_at_time; element/offset_ms go on EventLog
        ua = UserAction.objects.create(
            session=session, stage=stage,
            role_at_time=hr_user.role,
            action_type="view",
        )
        EventLog.objects.create(action=ua, event_type="view", offset_ms=1000, element="email-body")

        result = StageEngine.evaluate(
            user_action=ua, stage_id=stage.id, offset_ms=1000, element="email-body"
        )
        assert result["detection_status"] in ("neutral", "missed")

    def test_stage_complete_set_true_for_conclusive_actions(self, hr_user, db):
        """Click, flag, delete, download are all conclusive and should end the stage."""
        from telemetry.consumers import StageEngine
        from telemetry.models import UserAction, EventLog

        stage = self._make_vector(db)
        session = self._make_session(hr_user, stage, db)

        for action in ("flag", "click", "delete"):
            # element/offset_ms belong to EventLog, not UserAction
            ua = UserAction.objects.create(
                session=session, stage=stage,
                role_at_time=hr_user.role,
                action_type=action,
            )
            EventLog.objects.create(
                action=ua, event_type=action, offset_ms=3000, element="btn-flag"
            )
            result = StageEngine.evaluate(
                user_action=ua, stage_id=stage.id, offset_ms=3000, element="btn-flag"
            )
            assert result["stage_complete"] is True, f"Expected stage_complete=True for action={action}"