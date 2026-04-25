import pytest
from unittest.mock import MagicMock, patch

@pytest.mark.django_db
class TestScenarioActivation:
    def test_activation_fails_for_missing_image(self, admin_client, admin_user, db):
        from scenarios.models import Scenario
        scenario = Scenario.objects.create(
            title="Missing Image Scenario",
            container_image="does-not-exist:latest",
            active_status=False
        )
        # docker is imported *locally* inside the serializer's validate() method,
        # so we patch at the source module level rather than the serializer namespace.
        with patch("docker.from_env") as mock_from_env:
            mock_from_env.return_value.images.get.side_effect = Exception("Not found")
            response = admin_client.patch(f"/api/scenarios/{scenario.id}/activate/")
        assert response.status_code == 400

    def test_activation_succeeds_for_existing_image(self, admin_client, admin_user, db):
        from scenarios.models import Scenario, Stage
        scenario = Scenario.objects.create(
            title="Real Image Scenario",
            container_image="rasp-phishing-recruiter:latest",
            active_status=False
        )
        # The ScenarioWriteSerializer validates that a scenario must have 2–5 stages
        # before active_status can be set to True (BR-01). Create the minimum 2 stages.
        Stage.objects.create(scenario=scenario, stage_order=1, name="application")
        Stage.objects.create(scenario=scenario, stage_order=2, name="screening")

        with patch("docker.from_env") as mock_from_env:
            mock_from_env.return_value.images.get.return_value = MagicMock()
            response = admin_client.patch(f"/api/scenarios/{scenario.id}/activate/")
        assert response.status_code in (200, 202)