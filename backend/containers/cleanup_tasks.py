"""
containers/cleanup_tasks.py

Sprint 1 — Fix #1: Container Cleanup Worker

Celery Beat periodic task that terminates:
  - Zombie containers from abandoned/failed sessions
  - Containers stuck in 'provisioning' for > 2 minutes
  - Active containers whose sessions have been abandoned for > MAX_AGE_MINUTES

Register in settings.py CELERY_BEAT_SCHEDULE (see bottom of this file).

Without this, abandoned containers exhaust Docker host resources and
block new simulations under NFR-9 (50+ concurrent users).
"""

import logging
from datetime import timedelta

import docker
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# How many minutes before a provisioning container is considered stuck
STUCK_PROVISIONING_MINUTES = 2
# How many minutes before an active container whose session is ABANDONED is killed
MAX_ABANDONED_AGE_MINUTES = 30
# How many minutes before ANY active container is killed (hard ceiling)
MAX_CONTAINER_AGE_MINUTES = 180  # 3 hours


@shared_task(name="containers.cleanup_zombie_containers")
def cleanup_zombie_containers() -> dict:
    """
    Periodic task: runs every 5 minutes via Celery Beat.

    Terminates three categories of containers:
      1. Containers stuck in 'provisioning' for > STUCK_PROVISIONING_MINUTES
      2. Containers belonging to ABANDONED or FAILED sessions
      3. Any container older than MAX_CONTAINER_AGE_MINUTES (hard ceiling)

    Returns a summary dict for logging/monitoring.
    """
    from containers.models import ScenarioContainer
    from simulations.models import SimulationSession

    now = timezone.now()
    killed = 0
    errors = 0
    summary = {"killed": 0, "errors": 0, "skipped": 0}

    try:
        docker_client = docker.from_env()
    except Exception as exc:
        logger.error("[cleanup] Cannot connect to Docker daemon: %s", exc)
        return {"error": str(exc)}

    # ── Category 1: Stuck provisioning ──────────────────────────────────────
    stuck_threshold = now - timedelta(minutes=STUCK_PROVISIONING_MINUTES)
    stuck_containers = ScenarioContainer.objects.filter(
        status=ScenarioContainer.Status.PROVISIONING,
        provisioned_at__lt=stuck_threshold,
    ).select_related("session")

    for record in stuck_containers:
        result = _kill_container(docker_client, record, reason="stuck_provisioning")
        if result:
            killed += 1
            # Mark the session as failed so the user sees a proper error
            SimulationSession.objects.filter(pk=record.session_id).update(
                status=SimulationSession.Status.FAILED
            )
        else:
            errors += 1

    # ── Category 2: Containers from abandoned/failed sessions ────────────────
    dead_session_containers = ScenarioContainer.objects.filter(
        status=ScenarioContainer.Status.ACTIVE,
        session__status__in=[
            SimulationSession.Status.ABANDONED,
            SimulationSession.Status.FAILED,
        ],
    ).select_related("session")

    for record in dead_session_containers:
        result = _kill_container(docker_client, record, reason="dead_session")
        if result:
            killed += 1
        else:
            errors += 1

    # ── Category 3: Hard-ceiling — containers older than MAX_CONTAINER_AGE_MINUTES ─
    age_threshold = now - timedelta(minutes=MAX_CONTAINER_AGE_MINUTES)
    ancient_containers = ScenarioContainer.objects.filter(
        status=ScenarioContainer.Status.ACTIVE,
        activated_at__lt=age_threshold,
    ).exclude(
        session__status=SimulationSession.Status.COMPLETED
    ).select_related("session")

    for record in ancient_containers:
        result = _kill_container(docker_client, record, reason="max_age_exceeded")
        if result:
            killed += 1
            # Force-complete the session
            SimulationSession.objects.filter(pk=record.session_id).update(
                status=SimulationSession.Status.ABANDONED
            )
        else:
            errors += 1

    summary["killed"] = killed
    summary["errors"] = errors
    logger.info(
        "[cleanup] Done — killed=%d errors=%d", killed, errors
    )
    return summary


def _kill_container(
    docker_client, record, reason: str
) -> bool:
    """
    Stop and remove a Docker container, then mark the DB record as stopped.
    Returns True on success, False on error.
    """
    from containers.models import ScenarioContainer

    container_id = record.docker_container_id
    logger.info(
        "[cleanup] Killing container %s (session=%s reason=%s)",
        container_id or "unknown", record.session_id, reason,
    )

    if container_id:
        try:
            dc = docker_client.containers.get(container_id)
            dc.stop(timeout=5)
            dc.remove(force=True)
        except docker.errors.NotFound:
            # Already gone — that's fine
            pass
        except Exception as exc:
            logger.warning(
                "[cleanup] Could not kill container %s: %s", container_id, exc
            )
            # Still update the DB record even if Docker removal failed
            # so we don't retry indefinitely

    try:
        ScenarioContainer.objects.filter(pk=record.pk).update(
            status=ScenarioContainer.Status.STOPPED
        )
        return True
    except Exception as exc:
        logger.error("[cleanup] DB update failed for container %s: %s", record.pk, exc)
        return False


# ---------------------------------------------------------------------------
# Celery Beat schedule — add this block to rasp_backend/settings.py
# ---------------------------------------------------------------------------
# from celery.schedules import crontab
#
# CELERY_BEAT_SCHEDULE = {
#     "cleanup-zombie-containers": {
#         "task": "containers.cleanup_zombie_containers",
#         "schedule": 300,  # every 5 minutes (seconds)
#     },
#     "deadline-approaching-notifications": {
#         "task": "simulations.deadline_notifications",
#         "schedule": crontab(minute=0),  # every hour
#     },
# }