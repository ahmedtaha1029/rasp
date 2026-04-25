"""
users/models.py

Custom User model for RASP. Extends AbstractUser so Django's built-in
password hashing pipeline (bcrypt via PASSWORD_HASHERS) handles all
credential storage.

Changes from original:
  - Added account_type: individual (self-registered) vs organizational (admin-created)
  - Added 'both' Role: individual users who want HR + job-seeker scenarios
  - is_simulation_participant updated to include 'both'

Business rules enforced here:
  BR-10 – inactive accounts are rejected at authentication level.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError


class User(AbstractUser):
    """
    Platform user with role-based access control (NFR-2).

    Roles
    -----
    administrator  – full system access (org accounts only)
    hr_personnel   – simulation participant from recruiter perspective
    job_seeker     – simulation participant from candidate perspective
    both           – individual users who want both HR and job-seeker simulations

    Account types
    -------------
    organizational – created by an admin, gets assigned scenarios
    individual     – self-registered, sees public scenarios freely
    """

    class Role(models.TextChoices):
        ADMINISTRATOR = "administrator", "Administrator"
        HR_PERSONNEL  = "hr_personnel",  "HR Personnel"
        JOB_SEEKER    = "job_seeker",    "Job Seeker"
        BOTH          = "both",          "Both (HR + Job Seeker)"

    class AccountType(models.TextChoices):
        ORGANIZATIONAL = "organizational", "Organizational"
        INDIVIDUAL     = "individual",     "Individual"

    class Status(models.TextChoices):
        ACTIVE   = "active",   "Active"
        INACTIVE = "inactive", "Inactive"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.JOB_SEEKER,
    )
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.ORGANIZATIONAL,
        help_text=(
            "Organizational: admin-created, gets assigned scenarios. "
            "Individual: self-registered, sees public scenarios."
        ),
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    # Override email to make it required and unique
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ["email", "role"]

    class Meta:
        db_table       = "users_user"
        verbose_name   = "User"
        verbose_name_plural = "Users"
        ordering       = ["username"]

    def __str__(self) -> str:
        return f"{self.username} ({self.get_role_display()})"

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def is_administrator(self) -> bool:
        return self.role == self.Role.ADMINISTRATOR

    @property
    def is_hr_personnel(self) -> bool:
        return self.role in (self.Role.HR_PERSONNEL, self.Role.BOTH)

    @property
    def is_job_seeker(self) -> bool:
        return self.role in (self.Role.JOB_SEEKER, self.Role.BOTH)

    @property
    def is_simulation_participant(self) -> bool:
        return self.role in (
            self.Role.HR_PERSONNEL,
            self.Role.JOB_SEEKER,
            self.Role.BOTH,
        )

    @property
    def is_individual(self) -> bool:
        return self.account_type == self.AccountType.INDIVIDUAL

    @property
    def is_active_account(self) -> bool:
        """BR-10: Inactive accounts must be refused authentication."""
        return self.status == self.Status.ACTIVE

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def clean(self) -> None:
        super().clean()
        if self.pk:
            original = User.objects.filter(pk=self.pk).values("status").first()
            if (
                original
                and original["status"] == self.Status.INACTIVE
                and self.status == self.Status.ACTIVE
                and not getattr(self, "_change_triggered_by_admin", False)
            ):
                raise ValidationError(
                    "Deactivated accounts can only be reactivated by an Administrator."
                )

    _change_triggered_by_admin: bool = False