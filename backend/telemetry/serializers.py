"""
telemetry/serializers.py

Serializers for WebSocket telemetry events and scored user actions.

Data flow (telemetry_detection_sequence diagram):
  SimulationContainer → WS message → TelemetryHandler
  → EventLogInboundSerializer validates the raw WS payload
  → EventLog rows inserted
  → StageEngine evaluates → UserAction.detection_quality updated
  → UserActionFeedbackSerializer shapes the feedback response

Business rules enforced here:
  BR-05 – No PII ever enters EventLog or UserAction.
           The inbound WS message carries only {event_type, offset_ms,
           element} — no user identifier. Session context comes from
           the authenticated WebSocket connection scope, not the payload.
  BR-07 – Credential form submissions: the 'submit' action type is
           accepted but any 'submitted_values' field in the payload is
           explicitly stripped before writing to the database.
"""

from rest_framework import serializers

from .models import EventLog, UserAction


# ---------------------------------------------------------------------------
# Inbound WebSocket message (from simulation container → TelemetryHandler)
# ---------------------------------------------------------------------------

class EventLogInboundSerializer(serializers.Serializer):
    """
    Validates the raw WebSocket message emitted by the simulation container.

    Expected payload shape (telemetry_detection_sequence):
        {
            "event_type": "click",
            "offset_ms": 4520,
            "element": "resume-download-btn"
        }

    BR-07: Any 'submitted_values' or credential-like keys are explicitly
    rejected to ensure they never touch the database.
    """

    FORBIDDEN_KEYS = {"submitted_values", "credentials", "password", "token"}

    event_type = serializers.CharField(max_length=50)
    offset_ms = serializers.IntegerField(min_value=0)
    element = serializers.CharField(max_length=255)

    def validate(self, attrs: dict) -> dict:
        # BR-07: reject any attempt to sneak credential data into telemetry
        raw = self.initial_data or {}
        forbidden_found = self.FORBIDDEN_KEYS & set(raw.keys())
        if forbidden_found:
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"Telemetry payload must not contain credential "
                        f"or PII fields: {forbidden_found}. (BR-07)"
                    )
                }
            )
        return attrs


# ---------------------------------------------------------------------------
# UserAction read serializer — analytics and feedback
# ---------------------------------------------------------------------------

class UserActionSerializer(serializers.ModelSerializer):
    """
    Read serializer for a scored user action.

    BR-05 compliance: session_id is a UUID (not a username or email).
    role_at_time is a plain string snapshot. No PII fields present.
    """

    action_type_display = serializers.CharField(
        source="get_action_type_display", read_only=True
    )

    class Meta:
        model = UserAction
        fields = [
            "id",
            "session",              # UUID FK
            "stage",
            "role_at_time",         # string snapshot, not a user FK
            "action_type",
            "action_type_display",
            "detection_quality",    # 0.0–1.0
            "time_to_detect",       # milliseconds
            "detected",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Feedback serializer — returned to the user after StageEngine evaluation
# ---------------------------------------------------------------------------

class DetectionFeedbackSerializer(serializers.Serializer):
    """
    Shapes the contextual feedback response sent to the user after each
    decision (FR-19, telemetry_detection_sequence: 'Feedback detected/missed').

    Fields are populated by the StageEngine after evaluating the
    UserAction against the AttackVector's detection_criteria JSON.
    """

    detected = serializers.BooleanField()
    detection_quality = serializers.FloatField(min_value=0.0, max_value=1.0)
    time_to_detect_ms = serializers.IntegerField(allow_null=True)

    # FR-19: contextual explanation of what happened
    result_label = serializers.CharField()          # e.g. "Attack Missed"
    explanation = serializers.CharField()           # what indicators were missed
    indicators_missed = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )
    best_practice = serializers.CharField()         # what the user should have done
    mitre_id = serializers.CharField(allow_blank=True)
    mitre_description = serializers.CharField(allow_blank=True)

    # FR-20: difficulty recommendation after this action
    recommended_difficulty = serializers.CharField(allow_null=True)