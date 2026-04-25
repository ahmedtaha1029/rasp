"""
containers/tasks.py
Celery task that provisions a Docker simulation container for each session.
Updated to support Dynamic Port Mapping for multi-user isolation.
"""

import json
import logging
import docker
from celery import shared_task
from django.conf import settings
from containers.tokens import ContainerWSToken
 
logger = logging.getLogger(__name__)
 
 
# ---------------------------------------------------------------------------
# REMOVED: find_free_port() — replaced by Docker automatic port assignment
# ---------------------------------------------------------------------------
# The old function had a TOCTOU race condition: the socket would be freed
# before Docker could bind the port, allowing another process to steal it.
# Docker's publish_all=True + reading container.ports is atomic and safe.
 
 
@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def provision_container(self, session_id: str, container_db_id: int) -> None:
    from containers.models import ScenarioContainer
    from simulations.models import SimulationSession
 
    try:
        container_record = ScenarioContainer.objects.select_related(
            "session__scenario"
        ).get(pk=container_db_id)
 
        session = container_record.session
        scenario = session.scenario
        image = scenario.container_image
 
        # ── Load stage / vector context ──────────────────────────────────────
        stage_id = "1"
        detection_criteria = {}
        image = scenario.container_image  # fallback

        VECTOR_IMAGES = {
            "phishing_link":   "rasp/sim-phishing:latest",
            "credential_form": "rasp/sim-credential-form:latest",
            "fake_identity":   "rasp/sim-fake-identity:latest",
            "geographic":      "rasp/sim-geographic:latest",
        }

        try:
            from scenarios.models import Stage, AttackVector

            stage = Stage.objects.filter(
                scenario=scenario,
                stage_order=session.current_stage_order,
            ).first()

            if stage:
                stage_id = str(stage.id)
                vector = AttackVector.objects.filter(stage=stage).first()
                if vector:
                    if vector.detection_criteria:
                        detection_criteria = vector.detection_criteria
                    # ← derive the correct image from this stage's vector type
                    image = VECTOR_IMAGES.get(vector.vector_type, scenario.container_image)

        except Exception as e:
            logger.warning(f"[provision] Could not load stage/vector: {e}")
 
        # ── JWT for container → backend WebSocket auth ───────────────────────
        ws_token = str(ContainerWSToken.for_user(session.user))
 
        # ── Start container with automatic port assignment (FIX #11) ─────────
        client = docker.from_env()
 
        logger.info(f"[provision] Pulling image '{image}' for session {session_id}")
        try:
            client.images.pull(image)
        except Exception as pull_err:
            logger.warning(f"[provision] Could not pull '{image}': {pull_err}. Using local cache.")
 
        # FIX #11: publish_all=True lets Docker pick a free ephemeral port.
        # No more find_free_port() race condition.
        container = client.containers.run(
            image=image,
            detach=True,
            network="rasp_rasp_internal",
            publish_all_ports=True,   # ← FIX #11: Docker assigns port atomically
            environment={
                "SESSION_ID": session_id,
                "SCENARIO_ID": str(scenario.id),
                "STAGE_ID": stage_id,
                "WS_BACKEND": "ws://rasp_backend:8000",
                "WS_TOKEN": ws_token,
                "COMPANY_PROFILE": scenario.company_profile or "",
                "DETECTION_CRITERIA": json.dumps(detection_criteria),
            },
        )
 
        # Connect to isolated bridge for security
        try:
            client.networks.get("rasp_bridge").connect(container)
        except Exception as net_err:
            logger.warning(f"[provision] Could not connect rasp_bridge: {net_err}")
 
        # ── Read assigned port from container.ports (FIX #11) ────────────────
        container.reload()
        ports = container.attrs.get("NetworkSettings", {}).get("Ports", {})
        host_port = None
        for port_binding, mappings in ports.items():
            if mappings:
                host_port = int(mappings[0]["HostPort"])
                break
 
        if host_port is None:
            raise RuntimeError(f"Docker did not assign a host port for container {container.short_id}")
 
        # ── Container IP on internal network for Django proxy ─────────────────
        networks = container.attrs["NetworkSettings"]["Networks"]
        internal = networks.get("rasp_rasp_internal", {})
        container_ip = internal.get("IPAddress", "")
        base_url = f"http://{container_ip}:3000"
 
        # ── Save and mark active ──────────────────────────────────────────────
        container_record.mark_active(
            docker_container_id=container.short_id,
            base_url=base_url,
            host_port=host_port,
        )
 
        SimulationSession.objects.filter(id=session_id).update(
            status=SimulationSession.Status.ACTIVE
        )
 
        logger.info(
            f"[provision] Container ready for session {session_id} "
            f"at port {host_port} (Docker auto-assigned)"
        )
 
    except Exception as exc:
        logger.error(f"[provision] Failed for session {session_id}: {exc}", exc_info=True)
        try:
            ScenarioContainer.objects.filter(pk=container_db_id).update(status="error")
            SimulationSession.objects.filter(id=session_id).update(status="failed")
 
            # Notify user of provisioning failure (Fix #12 — container_unavailable)
            _notify_provisioning_failure(session_id)
 
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
 
 
def _notify_provisioning_failure(session_id: str) -> None:
    """
    Fix #12: Create a container_unavailable notification when provisioning
    fails after all retries, so the user knows their session failed.
    """
    try:
        from simulations.models import SimulationSession
        from notifications.models import Notification
 
        session = SimulationSession.objects.select_related("scenario", "user").get(id=session_id)
        Notification.objects.create(
            user=session.user,
            notification_type=Notification.NotificationType.CONTAINER_UNAVAILABLE,
            message=(
                f"The simulation container for '{session.scenario.title}' "
                f"could not be started. Please try again or contact support."
            ),
            scenario=session.scenario,
        )
    except Exception as exc:
        logger.warning(f"[provision] Could not create failure notification: {exc}")
 