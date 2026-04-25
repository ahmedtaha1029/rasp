"""
scenarios/serializers.py

ScenarioListSerializer now includes `description` and `is_public` so
public-facing dashboard cards render without a detail-endpoint round-trip.
"""

from rest_framework import serializers
from datasets.serializers import DatasetFeatureSummarySerializer
from .models import AttackVector, Scenario, Stage


class AttackVectorWriteSerializer(serializers.ModelSerializer):
    dataset_features = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False,
        queryset=__import__("datasets.models", fromlist=["DatasetFeature"]).DatasetFeature.objects.all(),
        required=False,
    )

    class Meta:
        model  = AttackVector
        fields = ["id", "stage", "vector_type", "mitre_id", "container_path",
                  "detection_criteria", "difficulty", "dataset_features"]
        extra_kwargs = {"stage": {"read_only": True}}

    def validate(self, attrs):
        stage = attrs.get("stage", getattr(self.instance, "stage", None))
        qs = AttackVector.objects.filter(stage=stage)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.count() >= 3:
            raise serializers.ValidationError({"stage": "Stage already has 3 attack vectors. Maximum is 3. (BR-02)"})
        return attrs

    def create(self, validated_data):
        features = validated_data.pop("dataset_features", [])
        vector   = AttackVector.objects.create(**validated_data)
        if features:
            vector.dataset_features.set(features)
        return vector

    def update(self, instance, validated_data):
        features = validated_data.pop("dataset_features", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()
        if features is not None:
            instance.dataset_features.set(features)
        return instance


class AttackVectorReadSerializer(serializers.ModelSerializer):
    vector_type_display = serializers.CharField(source="get_vector_type_display", read_only=True)
    difficulty_display  = serializers.CharField(source="get_difficulty_display",  read_only=True)
    dataset_features    = DatasetFeatureSummarySerializer(many=True, read_only=True)

    class Meta:
        model = AttackVector
        fields = ["id", "vector_type", "vector_type_display", "mitre_id", "container_path",
                  "detection_criteria", "difficulty", "difficulty_display", "dataset_features"]
        read_only_fields = fields


class StageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Stage
        fields = ["id", "scenario", "stage_order", "name", "description"]
        extra_kwargs = {"scenario": {"read_only": True}}

    def validate(self, attrs):
        scenario = self.context.get("scenario")
        if scenario:
            existing = Stage.objects.filter(scenario=scenario)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.count() >= 5:
                raise serializers.ValidationError(
                    {"stage_order": "A scenario cannot have more than 5 stages. (BR-01)"}
                )
        return attrs


class StageReadSerializer(serializers.ModelSerializer):
    name_display   = serializers.CharField(source="get_name_display", read_only=True)
    attack_vectors = AttackVectorReadSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ["id", "stage_order", "name", "name_display", "description", "attack_vectors"]
        read_only_fields = fields


class ScenarioWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Scenario
        fields = ["id", "title", "description", "company_profile", "container_image",
                  "active_status", "is_public", "difficulty", "version"]
        read_only_fields = ["id", "version"]

    def validate(self, attrs):
        activating = attrs.get("active_status", getattr(self.instance, "active_status", False))
        if activating and self.instance:
            stage_count = self.instance.stages.count()
            if not (2 <= stage_count <= 5):
                raise serializers.ValidationError(
                    {"active_status": f"Scenario must have 2–5 stages before activation. Current: {stage_count}. (BR-01)"}
                )
            from django.db.models import Q
            if AttackVector.objects.filter(stage__scenario=self.instance).filter(
                Q(mitre_id__isnull=True) | Q(mitre_id="")
            ).exists():
                raise serializers.ValidationError(
                    {"active_status": "All attack vectors must have a MITRE ATT&CK ID before activation. (BR-03)"}
                )
            container_image = attrs.get("container_image", self.instance.container_image)
            if container_image:
                try:
                    import docker
                    docker.from_env().images.get(container_image)
                except Exception:
                    raise serializers.ValidationError({
                        "container_image": (
                            f"Docker image '{container_image}' was not found in the local registry. "
                            "Build or pull it before activating. (Fix #16)"
                        )
                    })
        return attrs


class ScenarioListSerializer(serializers.ModelSerializer):
    """
    List + public-endpoint serializer.
    Includes description and is_public so dashboard cards render fully
    without hitting the detail endpoint.
    """
    difficulty_display = serializers.CharField(source="get_difficulty_display", read_only=True)
    stage_count        = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            "id", "title", "description", "version",
            "active_status", "is_public",
            "difficulty", "difficulty_display", "stage_count",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_stage_count(self, obj):
        return obj.stages.count()


class ScenarioDetailSerializer(serializers.ModelSerializer):
    difficulty_display = serializers.CharField(source="get_difficulty_display", read_only=True)
    stages             = StageReadSerializer(many=True, read_only=True)

    class Meta:
        model = Scenario
        fields = [
            "id", "title", "description", "company_profile",
            "version", "container_image", "active_status", "is_public",
            "difficulty", "difficulty_display", "stages",
            "created_at", "updated_at",
        ]
        read_only_fields = fields