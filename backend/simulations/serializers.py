"""
simulations/serializers.py

AssignmentReadSerializer now returns a computed `status` and `session`
object so dashboards can split into not-started / paused / completed
without extra round-trips.

Status values:
  "not_started"  – no session ever started
  "in_progress"  – active or provisioning session exists
  "paused"       – most-recent session is paused
  "completed"    – most-recent session is completed
"""

from rest_framework import serializers
from scenarios.serializers import ScenarioListSerializer
from users.serializers import UserSummarySerializer
from .models import Assignment, SimulationSession


class AssignmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model        = Assignment
        fields       = ["id", "user", "scenario", "assigned_at", "deadline"]
        read_only_fields = ["id", "assigned_at"]

    def validate_scenario(self, scenario):
        if not scenario.active_status:
            raise serializers.ValidationError(
                f"Scenario '{scenario.title}' is not active and cannot be assigned. (BR-06)"
            )
        return scenario

    def validate(self, attrs):
        user     = attrs.get("user")
        scenario = attrs.get("scenario")
        if Assignment.objects.filter(user=user, scenario=scenario).exists():
            raise serializers.ValidationError(
                {"user": f"User '{user.username}' is already assigned to scenario '{scenario.title}'."}
            )
        return attrs


class AssignmentReadSerializer(serializers.ModelSerializer):
    """
    Read serializer for user-facing assignment lists.
    Adds computed `status` and `session` fields derived from the user's
    most-recent SimulationSession for this scenario, so the frontend can
    split the list into not-started / paused / completed buckets.
    """

    user     = UserSummarySerializer(read_only=True)
    scenario = ScenarioListSerializer(read_only=True)
    status   = serializers.SerializerMethodField()
    session  = serializers.SerializerMethodField()

    class Meta:
        model        = Assignment
        fields       = ["id", "user", "scenario", "assigned_at", "deadline", "status", "session"]
        read_only_fields = fields

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _latest_session(self, obj):
        """Return the most-recent SimulationSession for this assignment (cached)."""
        if not hasattr(obj, "_cached_session"):
            obj._cached_session = (
                SimulationSession.objects
                .filter(user=obj.user, scenario=obj.scenario)
                .order_by("-started_at")
                .first()
            )
        return obj._cached_session

    # ------------------------------------------------------------------
    # Computed fields
    # ------------------------------------------------------------------

    def get_status(self, obj) -> str:
        session = self._latest_session(obj)
        if not session:
            return "not_started"
        if session.status == SimulationSession.Status.COMPLETED:
            return "completed"
        if session.status == SimulationSession.Status.PAUSED:
            return "paused"
        if session.status in (
            SimulationSession.Status.ACTIVE,
            SimulationSession.Status.PROVISIONING,
        ):
            return "in_progress"
        return "not_started"

    def get_session(self, obj):
        """
        Returns minimal session info so the frontend can:
          - Show completed_at date for completed simulations
          - Pass session_id to the resume endpoint for paused simulations
        Score is approximated as detection_rate from the telemetry aggregate
        if available; falls back to None.
        """
        session = self._latest_session(obj)
        if not session:
            return None

        score = None
        if session.status == SimulationSession.Status.COMPLETED:
            score = self._compute_score(session)

        return {
            "id":           str(session.id),
            "status":       session.status,
            "started_at":   session.started_at,
            "completed_at": session.completed_at,
            "score":        score,        # detection-rate % (0-100) or None
        }

    @staticmethod
    def _compute_score(session):
        """
        Compute a 0-100 detection score from telemetry data.
        Tries analytics.AnalyticsMetric aggregation; returns None if
        that model is not yet available so callers can show '—'.
        """
        try:
            from analytics.models import AnalyticsMetric
            from django.db.models import Sum
            agg = AnalyticsMetric.objects.filter(
                session=session
            ).aggregate(
                total=Sum("total_actions"),
                detected=Sum("detected_actions"),
            )
            total    = agg["total"]    or 0
            detected = agg["detected"] or 0
            if total == 0:
                return None
            return round((detected / total) * 100)
        except Exception:
            return None


# ---------------------------------------------------------------------------
# Session serializer (used by SessionListView / mine endpoint)
# ---------------------------------------------------------------------------

class PublicSessionSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for GET /api/sessions/mine/
    Used by individual-account dashboards that don't have Assignment records.
    """
    scenario_id    = serializers.IntegerField(source="scenario.id",    read_only=True)
    scenario_title = serializers.CharField(source="scenario.title",    read_only=True)
    scenario_difficulty         = serializers.IntegerField(source="scenario.difficulty",         read_only=True)
    scenario_difficulty_display = serializers.CharField(source="scenario.get_difficulty_display", read_only=True)
    scenario_stage_count        = serializers.SerializerMethodField()
    score                       = serializers.SerializerMethodField()

    class Meta:
        model  = SimulationSession
        fields = [
            "id", "status", "started_at", "completed_at",
            "scenario_id", "scenario_title",
            "scenario_difficulty", "scenario_difficulty_display",
            "scenario_stage_count", "score",
        ]

    def get_scenario_stage_count(self, obj):
        return obj.scenario.stages.count()

    def get_score(self, obj):
        return AssignmentReadSerializer._compute_score(obj)


# ---------------------------------------------------------------------------
# Session lifecycle serializers (unchanged)
# ---------------------------------------------------------------------------

class SessionStartSerializer(serializers.Serializer):
    scenario_id = serializers.IntegerField()

    def validate_scenario_id(self, value):
        from scenarios.models import Scenario
        try:
            scenario = Scenario.objects.get(pk=value)
        except Scenario.DoesNotExist:
            raise serializers.ValidationError("Scenario not found.")

        if not scenario.active_status:
            raise serializers.ValidationError(f"Scenario '{scenario.title}' is not active. (BR-06)")

        user = self.context["request"].user

        if user.is_individual and scenario.is_public:
            return value

        if not Assignment.objects.filter(user=user, scenario=scenario).exists():
            if user.is_individual:
                raise serializers.ValidationError(
                    "This scenario is not publicly available. Contact an administrator."
                )
            raise serializers.ValidationError("You are not assigned to this scenario.")

        return value


class EthicalWarningSerializer(serializers.Serializer):
    acknowledged = serializers.BooleanField()

    def validate_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must acknowledge the ethical warning to proceed. (BR-04)"
            )
        return value


class SimulationSessionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    can_advance    = serializers.BooleanField(read_only=True)

    class Meta:
        model  = SimulationSession
        fields = [
            "id", "scenario", "current_stage_order", "version_snapshot",
            "status", "status_display", "ethical_warning_acknowledged",
            "can_advance", "started_at", "completed_at",
        ]
        read_only_fields = [
            "id", "version_snapshot", "ethical_warning_acknowledged",
            "started_at", "completed_at", "can_advance",
        ]


class SessionCompleteSerializer(serializers.Serializer):
    pass