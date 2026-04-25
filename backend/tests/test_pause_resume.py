# backend/tests/test_pause_resume.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
class TestPauseResume:
    def _make_session(self, user, db):
        from scenarios.models import Scenario
        from simulations.models import SimulationSession
        from containers.models import ScenarioContainer

        scenario = Scenario.objects.create(
            title="PR Test", container_image="rasp-phishing-recruiter:latest"
        )
        session = SimulationSession.objects.create(
            user=user, scenario=scenario, status="active",
            ethical_warning_acknowledged=True,
            version_snapshot=1,              # ← add this
        )
        ScenarioContainer.objects.create(
            session=session, status="active",
            docker_container_id="abc123", base_url="http://x:3000"
        )
        return session

    def test_pause_sets_status_paused(self, hr_client, hr_user, db):
        session = self._make_session(hr_user, db)
        with patch("simulations.pause_resume_views.docker") as mock_docker:
            mock_docker.from_env.return_value.containers.get.return_value = MagicMock()
            response = hr_client.post(f"/api/sessions/{session.id}/pause/")
        assert response.status_code == 200
        session.refresh_from_db()
        assert session.status == "paused"

    def test_resume_sets_status_active(self, hr_client, hr_user, db):
        from simulations.models import SimulationSession
        session = self._make_session(hr_user, db)
        SimulationSession.objects.filter(pk=session.pk).update(status="paused")

        with patch("simulations.pause_resume_views.docker") as mock_docker:
            mock_container = MagicMock()
            mock_container.status = "paused"
            mock_docker.from_env.return_value.containers.get.return_value = mock_container
            response = hr_client.post(f"/api/sessions/{session.id}/resume/")
        assert response.status_code == 200
        session.refresh_from_db()
        assert session.status == "active"

    def test_cannot_pause_already_paused_session(self, hr_client, hr_user, db):
        from simulations.models import SimulationSession
        session = self._make_session(hr_user, db)
        SimulationSession.objects.filter(pk=session.pk).update(status="paused")

        response = hr_client.post(f"/api/sessions/{session.id}/pause/")
        assert response.status_code == 404  # view queries for status=ACTIVE, so 404

    def test_cannot_pause_other_users_session(self, hr_client, job_seeker, db):
        session = self._make_session(job_seeker, db)
        response = hr_client.post(f"/api/sessions/{session.id}/pause/")
        assert response.status_code in (403, 404)