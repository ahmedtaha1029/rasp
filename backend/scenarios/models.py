"""
scenarios/models.py

Change: Added is_public field to Scenario.
  is_public=True → individual self-registered users can start this
  scenario without needing an Assignment record.
  Organizational users still need an assignment regardless.
"""

from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator


class Scenario(models.Model):

    class Difficulty(models.IntegerChoices):
        BASIC        = 1, "Basic"
        INTERMEDIATE = 2, "Intermediate"
        ADVANCED     = 3, "Advanced"

    title           = models.CharField(max_length=255)
    description     = models.TextField(blank=True)
    company_profile = models.TextField(
        blank=True,
        help_text=(
            "Fictional company used to brand all stages consistently. "
            "Example: Name: Acme Corp\nIndustry: Finance\nLocation: New York, NY"
        ),
    )
    version         = models.PositiveIntegerField(default=1)
    container_image = models.CharField(max_length=255)
    active_status   = models.BooleanField(default=False, db_index=True)
    is_public       = models.BooleanField(
        default=False,
        db_index=True,
        help_text=(
            "If True, individual (self-registered) users can start this scenario "
            "without needing an Assignment. Has no effect for organizational users."
        ),
    )
    difficulty      = models.IntegerField(choices=Difficulty.choices, default=Difficulty.BASIC)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    assigned_users = models.ManyToManyField(
        "users.User",
        through="simulations.Assignment",
        related_name="assigned_scenarios",
        blank=True,
    )

    class Meta:
        db_table = "scenario"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} (v{self.version})"

    def clean(self):
        if self.active_status and self.pk:
            stage_count = self.stages.count()
            if not (2 <= stage_count <= 5):
                raise ValidationError(
                    f"A scenario must have 2–5 stages before activation. "
                    f"Current count: {stage_count}. (BR-01)"
                )
            missing_mitre = AttackVector.objects.filter(
                stage__scenario=self
            ).filter(
                models.Q(mitre_id__isnull=True) | models.Q(mitre_id="")
            ).exists()
            if missing_mitre:
                raise ValidationError(
                    "All attack vectors must have a MITRE ATT&CK ID "
                    "before activation. (BR-03)"
                )

    def save(self, *args, **kwargs):
        if self.pk:
            self.version = models.F("version") + 1
        super().save(*args, **kwargs)
        if self.pk:
            self.refresh_from_db(fields=["version"])


class Stage(models.Model):

    class PhaseName(models.TextChoices):
        APPLICATION          = "application",          "Application"
        SCREENING            = "screening",            "Screening"
        INTERVIEW            = "interview",            "Interview"
        TECHNICAL_ASSESSMENT = "technical_assessment", "Technical Assessment"
        ONBOARDING           = "onboarding",           "Onboarding"

    scenario    = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="stages")
    stage_order = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    name        = models.CharField(max_length=50, choices=PhaseName.choices)
    description = models.TextField(blank=True)

    class Meta:
        db_table        = "stage"
        unique_together = [("scenario", "stage_order")]
        ordering        = ["scenario", "stage_order"]

    def __str__(self):
        return f"{self.scenario.title} | Stage {self.stage_order}: {self.get_name_display()}"


class AttackVector(models.Model):

    class VectorType(models.TextChoices):
        PHISHING_LINK   = "phishing_link",   "Phishing Link"
        MALICIOUS_FILE  = "malicious_file",  "Malicious File Download"
        CREDENTIAL_FORM = "credential_form", "Credential Harvesting Form"
        FAKE_IDENTITY   = "fake_identity",   "Fake Identity Indicator"
        GEOGRAPHIC      = "geographic",      "Geographic Inconsistency"
        URGENCY         = "urgency",         "Urgency Manipulation"

    stage              = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name="attack_vectors")
    vector_type        = models.CharField(max_length=30, choices=VectorType.choices)
    mitre_id           = models.CharField(max_length=20, blank=True)
    container_path     = models.CharField(max_length=255, default="/")
    detection_criteria = models.JSONField(default=dict)
    difficulty         = models.IntegerField(choices=Scenario.Difficulty.choices, default=Scenario.Difficulty.BASIC)
    dataset_features   = models.ManyToManyField(
        "datasets.DatasetFeature",
        related_name="attack_vectors",
        blank=True,
    )

    class Meta:
        db_table = "attack_vector"
        ordering = ["stage", "vector_type"]

    def __str__(self):
        return f"{self.get_vector_type_display()} [{self.mitre_id}] @ {self.stage}"

    def clean(self):
        if self.pk:
            count = AttackVector.objects.filter(stage=self.stage).exclude(pk=self.pk).count()
        else:
            count = AttackVector.objects.filter(stage=self.stage).count()
        if count >= 3:
            raise ValidationError("Stage already has 3 attack vectors. Maximum is 3 per stage. (BR-02)")