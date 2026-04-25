"""
datasets/serializers.py

Serializers for importing and reading DatasetFeature records.

Sources: EMSCAD (fraudulent job postings), PhishTank (phishing URLs),
URLhaus (malicious URLs). Each source has a different feature_data
schema — the serializer validates the JSON shape per source.

BR-11: Deletion protection is enforced at the model layer (DatasetFeature
.delete()). The serializer does not need to duplicate that logic.
"""

from rest_framework import serializers

from .models import DatasetFeature


# ---------------------------------------------------------------------------
# Feature data schema validators (DR-3)
# ---------------------------------------------------------------------------

REQUIRED_KEYS_BY_SOURCE = {
    DatasetFeature.Source.EMSCAD: [
        "title", "description", "required_experience",
    ],
    DatasetFeature.Source.PHISHTANK: [
        "url_pattern", "target_brand",
    ],
    DatasetFeature.Source.URLHAUS: [
        "url", "threat",
    ],
}


def validate_feature_data_schema(source: str, feature_data: dict) -> None:
    """
    Validate that feature_data contains the required keys for its source.
    Raises serializers.ValidationError on failure.
    """
    required = REQUIRED_KEYS_BY_SOURCE.get(source, [])
    missing = [k for k in required if k not in feature_data]
    if missing:
        raise serializers.ValidationError(
            {
                "feature_data": (
                    f"Missing required keys for source '{source}': "
                    f"{', '.join(missing)}"
                )
            }
        )


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

class DatasetFeatureSerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for admin-managed dataset import (FR-6).
    Validates feature_data schema against the declared source.
    """

    class Meta:
        model = DatasetFeature
        fields = [
            "id",
            "source",
            "label",
            "feature_data",
            "imported_at",
        ]
        read_only_fields = ["id", "imported_at"]

    def validate(self, attrs: dict) -> dict:
        source = attrs.get("source", getattr(self.instance, "source", None))
        feature_data = attrs.get(
            "feature_data", getattr(self.instance, "feature_data", {})
        )
        validate_feature_data_schema(source, feature_data)
        return attrs


class DatasetFeatureSummarySerializer(serializers.ModelSerializer):
    """
    Compact read-only representation used in AttackVector nested contexts.
    Omits the full feature_data blob to keep response payloads small.
    """

    source_display = serializers.CharField(
        source="get_source_display",
        read_only=True,
    )

    class Meta:
        model = DatasetFeature
        fields = ["id", "source", "source_display", "label"]
        read_only_fields = fields


class DatasetFeatureBulkImportSerializer(serializers.Serializer):
    """
    Accepts a list of feature records for batch import from a CSV/JSON
    upload (FR-6, admin scenario configuration workflow).

    Validates all records before writing any — all-or-nothing import.
    """

    source = serializers.ChoiceField(choices=DatasetFeature.Source.choices)
    features = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        min_length=1,
    )

    def validate(self, attrs: dict) -> dict:
        source = attrs["source"]
        for i, feature_data in enumerate(attrs["features"]):
            try:
                validate_feature_data_schema(source, feature_data)
            except serializers.ValidationError as e:
                raise serializers.ValidationError(
                    {f"features[{i}]": e.detail}
                )
        return attrs

    def save(self, **kwargs) -> list[DatasetFeature]:
        source = self.validated_data["source"]
        features = self.validated_data["features"]
        created = DatasetFeature.objects.bulk_create(
            [
                DatasetFeature(
                    source=source,
                    feature_data=f,
                    label=f.get("title", f.get("url_pattern", f.get("url", ""))),
                )
                for f in features
            ]
        )
        return created