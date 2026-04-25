import pytest
from django.urls import reverse
import uuid

@pytest.mark.django_db
class TestContainerProxy:
    def test_proxy_requires_authentication(self, api_client):
        fake_id = uuid.uuid4()
        url = f"/api/containers/{fake_id}/proxy/"
        response = api_client.get(url)
        assert response.status_code in (401, 404)

    def test_proxy_rejects_wrong_user(self, job_seeker, hr_user, db):
        """User B cannot access User A's session container."""
        from simulations.models import SimulationSession
        from containers.models import ScenarioContainer
        from scenarios.models import Scenario
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework.test import APIClient

        scenario = Scenario.objects.create(
            title="Test", container_image="rasp-phishing-recruiter:latest",
        )
        # version_snapshot is a PositiveIntegerField (BR-12).
        session = SimulationSession.objects.create(
            user=job_seeker, scenario=scenario, status="active",
            ethical_warning_acknowledged=True,
            version_snapshot=1,
        )
        ScenarioContainer.objects.create(
            session=session, status="active",
            base_url="http://172.18.0.99:3000",
            docker_container_id="abc123"
        )

        # ContainerProxyView validates JWT tokens directly (returns JsonResponse,
        # not DRF Response), so force_authenticate is bypassed. Use a real token.
        token = str(AccessToken.for_user(hr_user))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # hr_user is a different user from job_seeker — should get 404
        response = client.get(f"/api/containers/{session.id}/proxy/")
        assert response.status_code == 404

    def test_proxy_blocked_without_ethical_warning(self, hr_user, db):
        """Proxy returns 403 if ethical warning not acknowledged."""
        from simulations.models import SimulationSession
        from containers.models import ScenarioContainer
        from scenarios.models import Scenario
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework.test import APIClient

        scenario = Scenario.objects.create(
            title="Test2", container_image="rasp-phishing-recruiter:latest",
        )
        session = SimulationSession.objects.create(
            user=hr_user, scenario=scenario, status="active",
            ethical_warning_acknowledged=False,
            version_snapshot=1,
        )
        ScenarioContainer.objects.create(
            session=session, status="active",
            base_url="http://172.18.0.99:3000",
            docker_container_id="abc124"
        )

        # Use a real JWT token — ContainerProxyView does its own token validation.
        token = str(AccessToken.for_user(hr_user))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = client.get(f"/api/containers/{session.id}/proxy/")
        assert response.status_code == 403

    def test_proxy_invalid_uuid_returns_404_not_500(self, db):
        """Regression: integer session_id must not throw ValidationError."""
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import AccessToken

        User = get_user_model()
        user = User.objects.create_user(
            username="uuid_test", password="pass", role="hr_personnel"
        )
        token = str(AccessToken.for_user(user))

        from rest_framework.test import APIClient
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = client.get("/api/containers/11/proxy/")
        assert response.status_code == 404  # not 500