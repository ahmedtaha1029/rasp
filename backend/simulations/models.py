"""
simulations/models.py

Runtime state models: who is running what, and what version.

Tables: SimulationSession, Assignment

Business rules enforced here:
  BR-04 – session cannot advance past ethical warning without acknowledgement
  BR-06 – session cannot start on an inactive scenario
  BR-12 – session records the scenario version it started on (version_snapshot)
           so in-progress sessions complete against their original version
"""

import uuid

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Assignment(models.Model):
    """
    Records that an administrator has assigned a Scenario to a User (FR-22).

    An assignment is a prerequisite for starting a SimulationSession.
    Optional deadline support maps to FR-22 scheduling requirement.

    ER fields: id, user_id (FK), scenario_id (FK), assigned_at (timestamp)
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    scenario = models.ForeignKey(
        "scenarios.Scenario",
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    assigned_at = models.DateTimeField(default=timezone.now)
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional deadline for completing this assignment (FR-22).",
    )

    class Meta:
        db_table = "assignment"
        # A user can only be assigned the same scenario once at a time
        unique_together = [("user", "scenario")]
        ordering = ["-assigned_at"]
        verbose_name = "Assignment"
        verbose_name_plural = "Assignments"

    def __str__(self) -> str:
        return f"{self.user.username} → {self.scenario.title}"


class SimulationSession(models.Model):
    """
    One user's live execution of a Scenario.

    The PK is a UUID to avoid exposing sequential IDs in container URLs
    and WebSocket channels (security boundary, component diagram).

    version_snapshot captures the Scenario.version at session start so
    users who began on v1 complete v1 even if the admin updates to v2
    mid-session (BR-12).

    ER fields: id (uuid), user_id (FK), scenario_id (FK),
               current_stage_order, version_snapshot, status
    """

    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        PAUSED       = "paused",       "Paused"
        COMPLETED = "completed", "Completed"
        ABANDONED = "abandoned", "Abandoned"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="simulation_sessions",
    )
    scenario = models.ForeignKey(
        "scenarios.Scenario",
        on_delete=models.PROTECT,       # never delete a scenario with sessions
        related_name="sessions",
    )
    current_stage_order = models.PositiveSmallIntegerField(default=1)
    # BR-12: snapshot of version at session start
    version_snapshot = models.PositiveIntegerField(
        help_text="Scenario version captured when this session started (BR-12).",
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PROVISIONING,
        db_index=True,
    )
    # BR-04: ethical warning must be acknowledged before simulation starts
    ethical_warning_acknowledged = models.BooleanField(
        default=False,
        help_text=(
            "True once the user has clicked 'I Understand' on the "
            "ethical warning screen. Session cannot advance until True. (BR-04)"
        ),
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "simulation_session"
        ordering = ["-started_at"]
        verbose_name = "Simulation Session"
        verbose_name_plural = "Simulation Sessions"

    def __str__(self) -> str:
        return f"Session {self.id} | {self.user.username} | {self.scenario.title}"

    # ------------------------------------------------------------------
    # Business rule enforcement
    # ------------------------------------------------------------------

    def clean(self) -> None:
        """
        BR-06: A session cannot be initiated for a scenario whose
        active_status is False.
        """
        if not self.pk and not self.scenario.active_status:
            raise ValidationError(
                f"Cannot start a session for scenario '{self.scenario.title}' "
                f"because it is not active. (BR-06)"
            )

    def save(self, *args, **kwargs) -> None:
        """Capture version snapshot on first save (BR-12)."""
        if not self.pk:
            self.version_snapshot = self.scenario.version
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    # ------------------------------------------------------------------
    # Convenience methods
    # ------------------------------------------------------------------

    def can_advance(self) -> bool:
        """
        BR-04: Returns True only if ethical warning has been acknowledged
        and session is in an advanceable state.
        """
        return self.ethical_warning_acknowledged and self.status == self.Status.ACTIVE

    def acknowledge_warning(self) -> None:
        """Record ethical warning acknowledgement (BR-04, FR-8)."""
        if not self.ethical_warning_acknowledged:
            self.ethical_warning_acknowledged = True
            self.save(update_fields=["ethical_warning_acknowledged"])