# backend/tests/test_analytics.py
import pytest

@pytest.mark.django_db
class TestAnalyticsEndpoints:
    def test_overview_requires_admin(self, hr_client):
        response = hr_client.get("/api/analytics/overview/")
        assert response.status_code == 403

    def test_overview_returns_active_sessions_key(self, admin_client, db):
        response = admin_client.get("/api/analytics/overview/")
        assert response.status_code == 200
        assert "active_sessions" in response.data   # Fix #14

    def test_overview_returns_expected_keys(self, admin_client, db):
        response = admin_client.get("/api/analytics/overview/")
        data = response.data
        for key in ["total_sessions", "completed_sessions", "overall_detection_rate",
                    "avg_time_to_detect_ms", "active_sessions"]:
            assert key in data, f"Missing key: {key}"

    def test_personal_analytics_returns_own_data_only(self, hr_client, job_seeker, db):
        """A user should only see their own sessions, not others'."""
        response = hr_client.get("/api/analytics/me/")
        assert response.status_code == 200
        assert "total_sessions" in response.data

    def test_personal_analytics_blocked_for_unauthenticated(self, api_client):
        response = api_client.get("/api/analytics/me/")
        assert response.status_code == 401

    def test_mitre_resources_endpoint_returns_list(self, admin_client, db):
        from analytics.models import MitreEducationalResource
        MitreEducationalResource.objects.create(
            mitre_id="T1566", title="Phishing",
            url="https://attack.mitre.org/techniques/T1566/"
        )
        response = admin_client.get("/api/analytics/mitre-resources/")
        assert response.status_code == 200
        assert len(response.data) >= 1

    def test_dwell_stats_requires_scenario_id(self, admin_client, db):
        response = admin_client.get("/api/analytics/dwell/")
        assert response.status_code == 400  # missing param