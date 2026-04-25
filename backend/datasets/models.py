"""
datasets/models.py

Imported fraud indicator records from external datasets.

Table: DatasetFeature

Sources (DR-3, FR-6, FR-13):
  EMSCAD  – fraudulent job posting characteristics (Vidros et al., 2017)
  PhishTank – known phishing URL patterns
  URLhaus  – malicious URL dataset

Business rules enforced here:
  BR-11 – A DatasetFeature cannot be deleted if it is currently
           referenced by any active AttackVector. Enforced via a
           pre_delete signal in datasets/signals.py (registered below).
"""

from django.db import models
from django.core.exceptions import ValidationError


class DatasetFeature(models.Model):
    """
    One imported fraud indicator used to make attack vectors realistic.

    The feature_data JSONField holds the raw indicator payload whose
    schema varies by source:
      EMSCAD  → {"description": "...", "salary_range": "...", "urgency": true, ...}
      PhishTank → {"url_pattern": "...", "target_brand": "...", ...}
      URLhaus → {"url": "...", "tags": [...], "threat": "..."}

    ER fields: id (bigint), source (string), feature_data (jsonb)
    """

    class Source(models.TextChoices):
        EMSCAD = "emscad", "EMSCAD (Fraudulent Job Postings)"
        PHISHTANK = "phishtank", "PhishTank (Phishing URLs)"
        URLHAUS = "urlhaus", "URLhaus (Malicious URLs)"

    source = models.CharField(
        max_length=15,
        choices=Source.choices,
        db_index=True,
        help_text="Origin dataset of this indicator (DR-3).",
    )
    feature_data = models.JSONField(
        help_text=(
            "Raw indicator payload. Schema varies by source: "
            "EMSCAD job posting fields, PhishTank URL patterns, "
            "or URLhaus threat tags."
        ),
    )
    # Human-readable label for admin UI
    label = models.CharField(
        max_length=255,
        blank=True,
        help_text="Short descriptor shown in the attack vector config UI.",
    )
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "dataset_feature"
        ordering = ["source", "-imported_at"]
        verbose_name = "Dataset Feature"
        verbose_name_plural = "Dataset Features"
        indexes = [
            models.Index(fields=["source"]),
        ]

    def __str__(self) -> str:
        return f"[{self.get_source_display()}] {self.label or f'Feature #{self.pk}'}"

    def delete(self, *args, **kwargs):
        """
        BR-11: Block deletion if any active AttackVector references this feature.

        'Active' means the parent scenario has active_status=True.
        """
        active_references = self.attack_vectors.filter(
            stage__scenario__active_status=True
        ).exists()
        if active_references:
            raise ValidationError(
                f"DatasetFeature '{self}' cannot be deleted because it is "
                f"referenced by one or more active attack vectors. "
                f"Deactivate the parent scenario first. (BR-11)"
            )
        super().delete(*args, **kwargs)