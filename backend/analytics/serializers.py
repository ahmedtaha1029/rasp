"""
analytics/serializers.py

Serializers for the analytics dashboard and report export.

Covers FR-14 through FR-18:
  FR-15 – time-to-detection per stage
  FR-16 – stage-based success metrics
  FR-17 – MITRE technique frequency dashboard
  FR-18 – PDF and CSV report export (data shaping only;
           rendering happens in analytics/reports.py)

All analytics data is aggregated at the Stage level (BR-09).
No PII is present in any response — session_ids are UUIDs and
role_at_time is a plain string (BR-05).
"""

from rest_framework import serializers

from .models import AnalyticsMetric


# ---------------------------------------------------------------------------
# Stage-level metrics (FR-16)
# ---------------------------------------------------------------------------

class AnalyticsMetricSerializer(serializers.ModelSerializer):
    """
    Per-stage performance metrics for the admin dashboard (FR-16).
    Computed properties are included as read-only fields.
    """

    stage_name = serializers.CharField(
        source="stage.get_name_display", read_only=True
    )
    stage_order = serializers.IntegerField(
        source="stage.stage_order", read_only=True
    )
    scenario_title = serializers.CharField(
        source="stage.scenario.title", read_only=True
    )
    # Computed from model @property
    detection_rate = serializers.FloatField(read_only=True)
    miss_rate = serializers.FloatField(read_only=True)
    avg_time_to_detect_ms = serializers.FloatField(read_only=True)

    class Meta:
        model = AnalyticsMetric
        fields = [
            "id",
            "stage",
            "stage_name",
            "stage_order",
            "scenario_title",
            "total_attempts",
            "total_detections",
            "detection_rate",
            "miss_rate",
            "avg_time_to_detect_ms",
            "last_updated",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# MITRE technique frequency (FR-17)
# ---------------------------------------------------------------------------

class MitreTechniqueFrequencySerializer(serializers.Serializer):
    """
    Aggregated miss rate per MITRE ATT&CK technique ID.

    Built by the analytics view by joining AnalyticsMetric → Stage
    → AttackVector and grouping by mitre_id.

    Sorted descending by miss_rate so the most-missed technique
    appears first in the dashboard (FR-17).
    """

    mitre_id = serializers.CharField()
    technique_description = serializers.CharField()
    total_presentations = serializers.IntegerField()
    total_misses = serializers.IntegerField()
    miss_rate = serializers.FloatField()


# ---------------------------------------------------------------------------
# Scenario-level summary (used in report generation FR-18)
# ---------------------------------------------------------------------------

class ScenarioPerformanceSummarySerializer(serializers.Serializer):
    """
    Rolls up all stage metrics for a single scenario into the
    executive summary block of the exported report (FR-18).
    """

    scenario_id = serializers.IntegerField()
    scenario_title = serializers.CharField()
    scenario_version = serializers.IntegerField()
    total_sessions = serializers.IntegerField()
    overall_detection_rate = serializers.FloatField()
    avg_time_to_detect_ms = serializers.FloatField()
    stage_metrics = AnalyticsMetricSerializer(many=True)
    mitre_frequencies = MitreTechniqueFrequencySerializer(many=True)


# ---------------------------------------------------------------------------
# Report export request (FR-18)
# ---------------------------------------------------------------------------

class ReportExportSerializer(serializers.Serializer):
    """
    Request body for POST /api/analytics/export/.

    Specifies which scenario to export and in which format.
    The view delegates to analytics/reports.py for actual rendering.
    """

    class Format(serializers.ChoiceField):
        pass

    scenario_id = serializers.IntegerField()
    format = serializers.ChoiceField(
        choices=["pdf", "csv"],
        default="pdf",
    )
    # Optional date range filter for time-series data
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                {"date_from": "date_from must be before date_to."}
            )
        return attrs