import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
class TestSessionLifecycle:
    def test_start_session_returns_202(self, hr_client, hr_user, db):
        from scenarios.models import Scenario
        from simulations.models import Assignment

        scenario = Scenario.objects.create(
            title="Lifecycle Test", container_image="rasp-phishing-recruiter:latest",
            active_status=True, is_public=True,
        )
        # is_public only bypasses assignment for users whose role is "individual"
        # (self-registered). hr_personnel still needs an explicit Assignment.
        Assignment.objects.create(user=hr_user, scenario=scenario)

        # provision_container is imported locally inside SessionStartView.post(),
        # not at simulations.views module level — patch at the task's own module.
        with patch("containers.tasks.provision_container") as mock_task:
            mock_task.delay.return_value = None
            response = hr_client.post(f"/api/sessions/start/{scenario.id}/")
        assert response.status_code == 202
        assert "session_id" in response.data

    def test_acknowledge_sets_flag(self, hr_client, hr_user, db):
        from scenarios.models import Scenario
        from simulations.models import SimulationSession

        scenario = Scenario.objects.create(
            title="Ack Test", container_image="rasp-phishing-recruiter:latest",
            active_status=True,
        )
        # version_snapshot is a PositiveIntegerField (BR-12) — pass integer 1.
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="active",
            ethical_warning_acknowledged=False,
            version_snapshot=1,
        )
        response = hr_client.post(
            f"/api/sessions/{session.id}/acknowledge/",
            {"acknowledged": True}, format="json"
        )
        assert response.status_code == 200
        session.refresh_from_db()
        assert session.ethical_warning_acknowledged is True

    def test_complete_session_sets_status(self, hr_client, hr_user, db):
        from scenarios.models import Scenario
        from simulations.models import SimulationSession
        from containers.models import ScenarioContainer

        scenario = Scenario.objects.create(
            title="Complete Test", container_image="rasp-phishing-recruiter:latest",
            active_status=True,
        )
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="active",
            ethical_warning_acknowledged=True,
            version_snapshot=1,
        )
        ScenarioContainer.objects.create(
            session=session, status="active",
            docker_container_id="abc", base_url="http://x:3000"
        )
        # docker is a local import inside SessionCompleteView — patch at source.
        with patch("docker.from_env"):
            response = hr_client.post(f"/api/sessions/{session.id}/complete/")
        assert response.status_code == 200
        session.refresh_from_db()
        assert session.status == "completed"