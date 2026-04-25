import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
class TestCleanupTask:
    def test_stuck_provisioning_container_is_killed(self, hr_user, db):
        from containers.models import ScenarioContainer
        from containers.cleanup_tasks import cleanup_zombie_containers
        from simulations.models import SimulationSession
        from scenarios.models import Scenario

        scenario = Scenario.objects.create(
            title="Cleanup Test", container_image="test:latest",
        )
        # version_snapshot is a PositiveIntegerField (BR-12 — scenario version
        # at session start). Pass 1 to match the newly-created scenario's version.
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="provisioning",
            version_snapshot=1,
        )
        container = ScenarioContainer.objects.create(
            session=session, status="provisioning",
            docker_container_id="deadbeef"
        )
        # Backdate so it's considered stuck
        ScenarioContainer.objects.filter(pk=container.pk).update(
            provisioned_at=timezone.now() - timedelta(minutes=10)
        )

        mock_docker = MagicMock()
        mock_docker.containers.get.return_value = MagicMock()

        with patch("containers.cleanup_tasks.docker.from_env", return_value=mock_docker):
            result = cleanup_zombie_containers()

        assert result["killed"] >= 1
        container.refresh_from_db()
        assert container.status == "stopped"

    def test_active_containers_from_abandoned_sessions_are_killed(self, hr_user, db):
        from containers.models import ScenarioContainer
        from containers.cleanup_tasks import cleanup_zombie_containers
        from simulations.models import SimulationSession
        from scenarios.models import Scenario

        scenario = Scenario.objects.create(
            title="Cleanup Test 2", container_image="test:latest",
        )
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="abandoned",
            version_snapshot=1,
        )
        ScenarioContainer.objects.create(
            session=session, status="active",
            docker_container_id="cafebabe"
        )

        mock_docker = MagicMock()
        mock_docker.containers.get.return_value = MagicMock()

        with patch("containers.cleanup_tasks.docker.from_env", return_value=mock_docker):
            result = cleanup_zombie_containers()

        assert result["killed"] >= 1