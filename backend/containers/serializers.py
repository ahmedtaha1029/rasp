"""
containers/serializers.py

Serializers for ScenarioContainer status — primarily consumed by
the SSE stream that pushes 'session_ready' events to the React
frontend (ScenarioLifecycle_sequence, component diagram SSE arrow).

The frontend polls or listens for container status changes to know
when to mount the simulation iframe.
"""

from rest_framework import serializers

from .models import ScenarioContainer


class ScenarioContainerSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for container status.

    base_url is only populated once status transitions to 'active'.
    The frontend should treat an empty base_url as 'still provisioning'.

    Never exposes docker_container_id or host_port to the client —
    those are internal orchestration details.
    """

    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    is_ready = serializers.SerializerMethodField()

    class Meta:
        model = ScenarioContainer
        fields = [
            "id",
            "session",       # UUID FK — safe to expose
            "status",
            "status_display",
            "base_url",
            "is_ready",
            "provisioned_at",
            "activated_at",
        ]
        read_only_fields = fields

    def get_is_ready(self, obj: ScenarioContainer) -> bool:
        """
        Convenience flag consumed by the React frontend to decide
        whether to mount the simulation iframe.
        """
        return obj.status == ScenarioContainer.Status.ACTIVE


class ContainerProvisioningResponseSerializer(serializers.Serializer):
    """
    Response body for POST /api/sessions/start/{scenario_id}.

    Returns 202 Accepted with session ID and initial container state
    so the frontend can open the SSE stream immediately
    (ScenarioLifecycle_sequence: '202 Accepted' → 'Emit session_ready').
    """

    session_id = serializers.UUIDField(read_only=True)
    container_status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)