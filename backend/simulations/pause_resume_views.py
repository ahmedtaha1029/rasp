"""
simulations/pause_resume_views.py

Adds POST /api/sessions/{id}/pause/  and  POST /api/sessions/{id}/resume/
so users who lose connection or need to break mid-scenario can resume
without data loss.

Docker pause/unpause is used so the container process state is preserved.
The session status transitions:
  ACTIVE → PAUSED   (pause)
  PAUSED → ACTIVE   (resume)

Register these URLs in simulations/urls.py:
  path("sessions/<str:pk>/pause/",  SessionPauseView.as_view(),  name="session-pause"),
  path("sessions/<str:pk>/resume/", SessionResumeView.as_view(), name="session-resume"),
"""

import logging

import docker
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsSimulationParticipant
from .models import SimulationSession

logger = logging.getLogger(__name__)


class SessionPauseView(APIView):
    """
    POST /api/sessions/{id}/pause/

    Pauses the Docker container associated with the session, preserving
    its in-memory state. The session status moves to 'paused' so the
    frontend can show a resume button on the next login.

    Only the session owner may pause it. Session must be ACTIVE.
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, pk: str) -> Response:
        try:
            session = SimulationSession.objects.select_related("container").get(
                id=pk,
                user=request.user,
                status=SimulationSession.Status.ACTIVE,
            )
        except SimulationSession.DoesNotExist:
            return Response(
                {"detail": "Active session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Pause the Docker container
        container_id = None
        try:
            container = session.container
            container_id = container.docker_container_id
            if container_id:
                client = docker.from_env()
                dc = client.containers.get(container_id)
                dc.pause()
                logger.info("[pause] Container %s paused for session %s", container_id, pk)
        except Exception as exc:
            logger.warning("[pause] Could not pause container %s: %s", container_id, exc)
            # Still mark paused in DB — user can resume (container will be re-provisioned
            # if Docker state was lost, handled in SessionResumeView)

        # Update session status to PAUSED
        SimulationSession.objects.filter(pk=pk).update(
            status=SimulationSession.Status.PAUSED
        )

        return Response(
            {
                "session_id": pk,
                "status": "paused",
                "message": "Session paused. Resume from the dashboard when ready.",
            },
            status=status.HTTP_200_OK,
        )


class SessionResumeView(APIView):
    """
    POST /api/sessions/{id}/resume/

    Resumes a previously paused session. Attempts to unpause the Docker
    container. If the container is no longer available (e.g., host
    restarted), re-provisions a new container for the current stage.

    Session must be PAUSED.
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, pk: str) -> Response:
        try:
            session = SimulationSession.objects.select_related(
                "scenario", "container"
            ).get(
                id=pk,
                user=request.user,
                status=SimulationSession.Status.PAUSED,
            )
        except SimulationSession.DoesNotExist:
            return Response(
                {"detail": "Paused session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        container = session.container
        container_id = container.docker_container_id
        re_provisioned = False

        # Try to unpause the existing container
        try:
            if container_id:
                client = docker.from_env()
                dc = client.containers.get(container_id)
                if dc.status == "paused":
                    dc.unpause()
                    logger.info("[resume] Container %s unpaused for session %s", container_id, pk)
                elif dc.status != "running":
                    raise RuntimeError(f"Container in unexpected state: {dc.status}")
            else:
                raise RuntimeError("No container ID stored — must re-provision")

        except Exception as exc:
            # Container is gone — re-provision for current stage
            logger.warning(
                "[resume] Cannot unpause container %s: %s — re-provisioning",
                container_id, exc,
            )
            from django.utils import timezone
            container.docker_container_id = ""
            container.base_url = ""
            container.host_port = None
            container.activated_at = None
            container.status = "provisioning"
            container.save(update_fields=[
                "docker_container_id", "base_url", "host_port", "activated_at", "status",
            ])

            from containers.tasks import provision_container
            provision_container.delay(str(session.id), container.id)
            re_provisioned = True

        # Mark session ACTIVE
        SimulationSession.objects.filter(pk=pk).update(
            status=SimulationSession.Status.ACTIVE
        )

        return Response(
            {
                "session_id": pk,
                "status": "active",
                "re_provisioned": re_provisioned,
                "message": (
                    "Session resuming — container is being re-provisioned. "
                    "Poll /containers/{session_id}/status/ for readiness."
                    if re_provisioned
                    else "Session resumed."
                ),
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# simulations/models.py — add PAUSED to SimulationSession.Status
# ---------------------------------------------------------------------------
# class Status(models.TextChoices):
#     PROVISIONING = "provisioning", "Provisioning"
#     ACTIVE       = "active",       "Active"
#     PAUSED       = "paused",       "Paused"       ← ADD THIS
#     COMPLETED    = "completed",    "Completed"
#     ABANDONED    = "abandoned",    "Abandoned"
#     FAILED       = "failed",       "Failed"
#
# Then run: python manage.py makemigrations simulations