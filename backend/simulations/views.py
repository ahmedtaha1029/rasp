"""
simulations/views.py

Session lifecycle endpoints.

ScenarioLifecycle_sequence diagram:
  POST /api/sessions/start/{scenario_id}/ → 202 Accepted + Celery task
  POST /api/sessions/{id}/acknowledge/    → BR-04 ethical warning
  POST /api/sessions/{id}/advance/        → increment stage, re-provision container
  POST /api/sessions/{id}/complete/       → SessionCompletion_sequence
  GET  /api/sessions/{id}/               → current session state

Assignment management (admin):
  GET/POST /api/assignments/
  GET      /api/assignments/{id}/
"""

import logging

from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics, permissions
from .models import SimulationSession
from .serializers import PublicSessionSerializer

from users.permissions import IsAdministrator, IsSimulationParticipant
from .models import Assignment, SimulationSession
from .serializers import (
    AssignmentReadSerializer,
    AssignmentWriteSerializer,
    EthicalWarningSerializer,
    SessionCompleteSerializer,
    SessionStartSerializer,
    SimulationSessionSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Assignment (admin)
# ---------------------------------------------------------------------------

class AssignmentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/assignments/ → admin sees all; participants see own
    POST /api/assignments/ → admin only (FR-22)
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdministrator()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AssignmentWriteSerializer
        return AssignmentReadSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_administrator:
            return Assignment.objects.select_related("user", "scenario").all()
        return Assignment.objects.select_related("scenario").filter(user=user)

    def perform_create(self, serializer):
        assignment = serializer.save()
        # FR-25: notify the assigned user
        from notifications.models import Notification
        Notification.objects.create(
            user=assignment.user,
            notification_type=Notification.NotificationType.SCENARIO_ASSIGNED,
            message=(
                f"You have been assigned to scenario: "
                f"'{assignment.scenario.title}'."
            ),
            scenario=assignment.scenario,
        )


class AssignmentDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/assignments/{id}/
    DELETE /api/assignments/{id}/ → admin only
    """

    serializer_class = AssignmentReadSerializer

    def get_permissions(self):
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), IsAdministrator()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_administrator:
            return Assignment.objects.all()
        return Assignment.objects.filter(user=user)


# ---------------------------------------------------------------------------
# Session lifecycle
# ---------------------------------------------------------------------------

class SessionStartView(APIView):
    """
    POST /api/sessions/start/{scenario_id}/

    ScenarioLifecycle_sequence:
      1. Validate assignment (BR-06)
      2. Create SimulationSession (status='provisioning')
      3. Create ScenarioContainer (status='provisioning')
      4. Return 202 Accepted immediately
      5. Celery task provisions Docker container asynchronously
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, scenario_id: int) -> Response:
        serializer = SessionStartSerializer(
            data={"scenario_id": scenario_id},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        from scenarios.models import Scenario
        from containers.models import ScenarioContainer

        scenario = Scenario.objects.get(pk=scenario_id)

        with transaction.atomic():
            session = SimulationSession.objects.create(
                user=request.user,
                scenario=scenario,
                version_snapshot=scenario.version,
                status=SimulationSession.Status.PROVISIONING,
            )
            container = ScenarioContainer.objects.create(session=session)

        # Kick off async Docker provisioning (Celery)
        from containers.tasks import provision_container
        provision_container.delay(str(session.id), container.id)

        from containers.serializers import ContainerProvisioningResponseSerializer
        response_data = ContainerProvisioningResponseSerializer({
            "session_id": session.id,
            "container_status": container.status,
            "message": "Session provisioning started. Listen to SSE stream for readiness.",
        })
        return Response(response_data.data, status=status.HTTP_202_ACCEPTED)


class SessionAcknowledgeView(APIView):
    """
    POST /api/sessions/{id}/acknowledge/

    BR-04: Records ethical warning acknowledgement.
    Session cannot advance to stage 1 until this is called.
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, pk: str) -> Response:
        session = self._get_session(request, pk)
        if not session:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EthicalWarningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.acknowledge_warning()
        return Response(
            {"detail": "Ethical warning acknowledged. Simulation may now begin."},
            status=status.HTTP_200_OK,
        )

    def _get_session(self, request, pk):
        try:
            return SimulationSession.objects.get(id=pk, user=request.user)
        except SimulationSession.DoesNotExist:
            return None


class SessionAdvanceView(APIView):
    """
    POST /api/sessions/{id}/advance/

    Called by the React frontend after the user completes a stage
    (when stage_complete=True is received over the telemetry WebSocket).

    Workflow:
      1. Validate the session is active and not on the last stage
      2. Stop the running Docker container for the current stage
      3. Reset the ScenarioContainer record to 'provisioning'
      4. Increment SimulationSession.current_stage_order
      5. Re-run the Celery provisioning task for the new stage
      6. Return 202 Accepted — frontend re-enters provisioning state
         and polls /containers/{id}/status/ as normal
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, pk: str) -> Response:
        try:
            session = SimulationSession.objects.select_related(
                "scenario", "container"
            ).get(
                id=pk,
                user=request.user,
                status=SimulationSession.Status.ACTIVE,
            )
        except SimulationSession.DoesNotExist:
            return Response(
                {"detail": "Active session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        total_stages = session.scenario.stages.count()

        if session.current_stage_order >= total_stages:
            return Response(
                {
                    "detail": (
                        "Already on the last stage. "
                        "Use POST /sessions/{id}/complete/ to end the session."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Stop old Docker container ────────────────────────────────────
        try:
            container = session.container
            if container.docker_container_id:
                import docker
                client = docker.from_env()
                try:
                    old_dc = client.containers.get(container.docker_container_id)
                    old_dc.stop(timeout=5)
                    old_dc.remove(force=True)
                    logger.info(
                        "[advance] Stopped container %s for session %s",
                        container.docker_container_id, pk,
                    )
                except Exception as docker_err:
                    # Container may already be stopped/removed; log and continue
                    logger.warning(
                        "[advance] Could not stop container %s: %s",
                        container.docker_container_id, docker_err,
                    )
        except Exception as exc:
            logger.warning("[advance] Container teardown error for session %s: %s", pk, exc)

        with transaction.atomic():
            # ── Reset the container record for re-provisioning ───────────
            from django.utils import timezone
            container.docker_container_id = ""
            container.base_url            = ""
            container.host_port           = None
            container.activated_at        = None
            container.status              = "provisioning"
            container.save(update_fields=[
                "docker_container_id", "base_url", "host_port",
                "activated_at", "status",
            ])

            # ── Advance the stage ────────────────────────────────────────
            session.current_stage_order += 1
            session.save(update_fields=["current_stage_order"])

        # ── Re-provision new container for the next stage ────────────────
        from containers.tasks import provision_container
        provision_container.delay(str(session.id), container.id)

        logger.info(
            "[advance] Session %s advanced to stage %d/%d",
            pk, session.current_stage_order, total_stages,
        )

        return Response(
            {
                "session_id":          str(session.id),
                "current_stage_order": session.current_stage_order,
                "total_stages":        total_stages,
                "container_status":    "provisioning",
                "message":             (
                    f"Advancing to stage {session.current_stage_order}. "
                    "Poll /containers/{session_id}/status/ for readiness."
                ),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class SessionDetailView(APIView):
    """
    GET /api/sessions/{id}/

    Returns current session state including stage progress and
    container readiness. Polled by the frontend during provisioning.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        try:
            qs = SimulationSession.objects.select_related(
                "scenario", "container"
            )
            if not request.user.is_administrator:
                qs = qs.filter(user=request.user)
            session = qs.get(id=pk)
        except SimulationSession.DoesNotExist:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SimulationSessionSerializer(session)
        return Response(serializer.data)


class SessionCompleteView(APIView):
    """
    POST /api/sessions/{id}/complete/

    SessionCompletion_sequence:
      1. UPDATE SimulationSession status='completed'
      2. For each stage: calculate final score + INSERT UserAction
      3. Atomic increment AnalyticsMetric counters
      4. INSERT Notification type='session_completed'
      5. Return 200 OK with final results
    """

    permission_classes = [permissions.IsAuthenticated, IsSimulationParticipant]

    def post(self, request: Request, pk: str) -> Response:
        try:
            session = SimulationSession.objects.get(
                id=pk,
                user=request.user,
                status=SimulationSession.Status.ACTIVE,
            )
        except SimulationSession.DoesNotExist:
            return Response(
                {"detail": "Active session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            # Mark session complete
            session.status = SimulationSession.Status.COMPLETED
            session.save(update_fields=["status", "completed_at"])

            # Stop running container
            try:
                container = session.container
                if container.docker_container_id:
                    import docker
                    client = docker.from_env()
                    try:
                        dc = client.containers.get(container.docker_container_id)
                        dc.stop(timeout=5)
                        dc.remove(force=True)
                    except Exception:
                        pass
                    container.status = "stopped"
                    container.save(update_fields=["status"])
            except Exception:
                pass

            # Atomically update AnalyticsMetric for each stage (BR-09)
            self._update_analytics(session)

            # FR-25: notify user of completion
            from notifications.models import Notification
            Notification.objects.create(
                user=request.user,
                notification_type=Notification.NotificationType.SESSION_COMPLETED,
                message=(
                    f"You completed the simulation: "
                    f"'{session.scenario.title}'."
                ),
                scenario=session.scenario,
            )

        serializer = SimulationSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _update_analytics(self, session: SimulationSession) -> None:
        """
        BR-09: Atomically increment per-stage AnalyticsMetric counters
        using F() expressions to prevent race conditions (NFR-9).
        """
        from django.db.models import F
        from analytics.models import AnalyticsMetric
        from telemetry.models import UserAction

        actions = UserAction.objects.filter(session=session)
        for action in actions:
            metric, _ = AnalyticsMetric.objects.get_or_create(
                stage=action.stage
            )
            AnalyticsMetric.objects.filter(pk=metric.pk).update(
                total_attempts=F("total_attempts") + 1,
                total_detections=F("total_detections") + (
                    1 if action.detected else 0
                ),
                cumulative_time_to_detect_ms=F("cumulative_time_to_detect_ms") + (
                    action.time_to_detect or 0
                ),
            )

class SessionListMineView(generics.ListAPIView):
    """
    GET /api/sessions/mine/
 
    Returns all SimulationSessions belonging to the current user,
    ordered most-recent first. No admin role required.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = PublicSessionSerializer
 
    def get_queryset(self):
        return (
            SimulationSession.objects
            .filter(user=self.request.user)
            .select_related("scenario")
            .order_by("-started_at")
        )