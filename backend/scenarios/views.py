"""
scenarios/views.py — added PublicScenarioListView
"""

from django.db import IntegrityError
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache

from users.permissions import IsAdministrator
from .models import AttackVector, Scenario, Stage
from .serializers import (
    AttackVectorReadSerializer, AttackVectorWriteSerializer,
    ScenarioDetailSerializer, ScenarioListSerializer, ScenarioWriteSerializer,
    StageReadSerializer, StageWriteSerializer,
)


class ScenarioListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdministrator()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return ScenarioWriteSerializer if self.request.method == "POST" else ScenarioListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_administrator:
            return Scenario.objects.all()
        if user.is_individual:
            return Scenario.objects.filter(active_status=True, is_public=True).distinct()
        return Scenario.objects.filter(active_status=True, assignments__user=user).distinct()


class PublicScenarioListView(generics.ListAPIView):
    """
    GET /api/scenarios/public/

    Active, publicly-available scenarios for self-registered (individual)
    users. No assignment required to view or start these.
    Must be registered BEFORE scenarios/<int:pk>/ to avoid Django matching
    "public" as a pk.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = ScenarioListSerializer

    def get_queryset(self):
        return Scenario.objects.filter(
            active_status=True, is_public=True
        ).order_by("difficulty", "created_at")


class ScenarioDetailView(generics.RetrieveUpdateAPIView):
    queryset = Scenario.objects.prefetch_related("stages__attack_vectors__dataset_features")

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdministrator()]

    def get_serializer_class(self):
        return ScenarioDetailSerializer if self.request.method in permissions.SAFE_METHODS else ScenarioWriteSerializer

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.save()
        return Response(ScenarioDetailSerializer(scenario).data, status=status.HTTP_200_OK)


class ScenarioActivateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def patch(self, request, pk):
        try:
            scenario = Scenario.objects.get(pk=pk)
        except Scenario.DoesNotExist:
            return Response({"detail": "Scenario not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = not scenario.active_status
        serializer = ScenarioWriteSerializer(scenario, data={"active_status": new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": f"Scenario {'activated' if new_status else 'deactivated'}.",
             "active_status": new_status, "version": scenario.version},
            status=status.HTTP_200_OK,
        )


class StageListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get_serializer_class(self):
        return StageWriteSerializer if self.request.method == "POST" else StageReadSerializer

    def get_queryset(self):
        return Stage.objects.filter(scenario_id=self.kwargs["scenario_pk"]).order_by("stage_order")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["scenario"] = Scenario.objects.get(pk=self.kwargs["scenario_pk"])
        except Scenario.DoesNotExist:
            pass
        return context

    def perform_create(self, serializer):
        try:
            serializer.save(scenario_id=self.kwargs["scenario_pk"])
        except IntegrityError:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"stage_order": "A stage with this order already exists. (BR-08)"})


class StageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get_serializer_class(self):
        return StageReadSerializer if self.request.method in permissions.SAFE_METHODS else StageWriteSerializer

    def get_queryset(self):
        return Stage.objects.filter(scenario_id=self.kwargs["scenario_pk"])


class AttackVectorListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get_serializer_class(self):
        return AttackVectorWriteSerializer if self.request.method == "POST" else AttackVectorReadSerializer

    def get_queryset(self):
        return AttackVector.objects.filter(stage_id=self.kwargs["stage_pk"])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context["stage"] = Stage.objects.get(pk=self.kwargs["stage_pk"])
        except Stage.DoesNotExist:
            pass
        return context

    def perform_create(self, serializer):
        serializer.save(stage_id=self.kwargs["stage_pk"])


class AttackVectorDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]

    def get_serializer_class(self):
        return AttackVectorReadSerializer if self.request.method in permissions.SAFE_METHODS else AttackVectorWriteSerializer

    def get_queryset(self):
        return AttackVector.objects.filter(stage_id=self.kwargs["stage_pk"])