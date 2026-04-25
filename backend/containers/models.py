"""
containers/models.py

Docker container lifecycle tracking.

Table: ScenarioContainer

Reflects the ScenarioLifecycle sequence diagram:
  SessionOrchestrator → Create ScenarioContainer (status='provisioning')
  → Async Provisioning Task → Docker Host SDK → Pull Image & Create Container
  → Update Container (status='active', base_url)
  → Emit 'session_ready' SSE event
"""

import uuid

from django.db import models


class ScenarioContainer(models.Model):
    """
    Tracks one Docker container instance provisioned for a SimulationSession.

    Lifecycle states mirror the SessionOrchestrator sequence diagram.
    The base_url is the internal container address proxied through Nginx
    to the participant's browser (component diagram: Nginx Reverse Proxy).

    ER fields: id, session_id (uuid FK), base_url, status
    """

    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        STOPPED = "stopped", "Stopped"
        ERROR = "error", "Error"

    # ER: session_id (uuid FK)
    session = models.OneToOneField(
        "simulations.SimulationSession",
        on_delete=models.CASCADE,
        related_name="container",
        db_column="session_id",
        help_text="One container per simulation session.",
    )
    # Docker-assigned container ID (short form, e.g. 'a3f9d12b')
    docker_container_id = models.CharField(
        max_length=64,
        blank=True,
        help_text="ID returned by docker-py after container creation.",
    )
    # Internal URL used by Nginx to proxy simulation requests
    base_url = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "Internal container URL (e.g. http://container-host:PORT). "
            "Populated by the async provisioning task once the container "
            "is active (ScenarioLifecycle_sequence)."
        ),
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PROVISIONING,
        db_index=True,
    )
    # Port assigned by Docker host
    host_port = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Host port mapped to the container's internal service port.",
    )
    provisioned_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the container transitioned to 'active'.",
    )

    class Meta:
        db_table = "scenario_container"
        verbose_name = "Scenario Container"
        verbose_name_plural = "Scenario Containers"

    def __str__(self) -> str:
        return (
            f"Container [{self.docker_container_id[:12] or 'pending'}] "
            f"session={self.session_id} status={self.status}"
        )

    def mark_active(self, docker_container_id: str, base_url: str, host_port: int) -> None:
        """
        Called by the async provisioning task (Celery) once Docker
        confirms the container is running.

        Emits the 'session_ready' SSE event via Django Channels after
        saving (handled in containers/tasks.py).
        """
        from django.utils import timezone

        self.docker_container_id = docker_container_id
        self.base_url = base_url
        self.host_port = host_port
        self.status = self.Status.ACTIVE
        self.activated_at = timezone.now()
        self.save(
            update_fields=[
                "docker_container_id",
                "base_url",
                "host_port",
                "status",
                "activated_at",
            ]
        )