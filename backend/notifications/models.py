"""
notifications/models.py
"""

from django.db import models
from django.utils import timezone


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        SCENARIO_ASSIGNED           = "scenario_assigned",           "Scenario Assigned"
        SESSION_COMPLETED           = "session_completed",           "Session Completed"
        SESSION_DEADLINE_APPROACHING = "session_deadline_approaching", "Deadline Approaching"  # Fix #12
        CONTAINER_UNAVAILABLE       = "container_unavailable",       "Container Unavailable"  # Fix #12

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=40,
        choices=NotificationType.choices,
    )
    message = models.TextField()
    scenario = models.ForeignKey(
        "scenarios.Scenario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notification"
        ordering = ["-created_at"]

    def mark_read(self) -> None:
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=["is_read"])

    def __str__(self):
        return f"[{self.notification_type}] → {self.user.username}"
