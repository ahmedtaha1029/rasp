"""
telemetry/models.py

Added HOVER = "hover", "Hover" to UserAction.ActionType so hover/dwell
events from the simulation container can be properly linked to UserAction
records for hesitation analysis (spec 5.5).

Also see: analytics/dwell_views.py for the hesitation analytics endpoint.
"""

from django.db import models


class UserAction(models.Model):
    """
    One scored decision made by a participant during a stage.
    BR-05: No PII stored — session_id (UUID) + role_at_time only.
    """

    class ActionType(models.TextChoices):
        CLICK    = "click",    "Click"
        DOWNLOAD = "download", "Download"
        FLAG     = "flag",     "Flag as Suspicious"
        SUBMIT   = "submit",   "Form Submit"
        VIEW     = "view",     "View"
        HOVER    = "hover",    "Hover"   # ← Fix #10: Added for dwell-time analysis
        DELETE   = "delete",   "Delete"
        REPLY    = "reply",    "Reply"

    session = models.ForeignKey(
        "simulations.SimulationSession",
        on_delete=models.CASCADE,
        related_name="user_actions",
        db_column="session_id",
    )
    stage = models.ForeignKey(
        "scenarios.Stage",
        on_delete=models.CASCADE,
        related_name="user_actions",
    )
    role_at_time = models.CharField(
        max_length=20,
        help_text="Role snapshot at time of action. Not a FK (BR-05).",
    )
    action_type = models.CharField(max_length=15, choices=ActionType.choices)
    detection_quality = models.FloatField(null=True, blank=True)
    time_to_detect = models.IntegerField(null=True, blank=True)
    detected = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_action"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session", "stage"]),
            models.Index(fields=["stage", "detected"]),
        ]

    def __str__(self) -> str:
        return (
            f"Action [{self.action_type}] session={self.session_id} "
            f"stage={self.stage_id} detected={self.detected}"
        )


class EventLog(models.Model):
    """
    Raw WebSocket telemetry events including hover/dwell events.
    Fix #10: HOVER events are now captured here for hesitation analysis.
    """

    action = models.ForeignKey(
        UserAction,
        on_delete=models.CASCADE,
        related_name="event_logs",
        db_column="action_id",
    )
    event_type = models.CharField(max_length=50)
    offset_ms = models.IntegerField()
    element = models.CharField(max_length=255)

    class Meta:
        db_table = "event_log"
        ordering = ["action", "offset_ms"]
        indexes = [
            models.Index(fields=["action", "offset_ms"]),
            models.Index(fields=["event_type", "element"]),   # ← Fix #10: for dwell queries
        ]

    def __str__(self) -> str:
        return f"[{self.event_type}] +{self.offset_ms}ms on '{self.element}'"