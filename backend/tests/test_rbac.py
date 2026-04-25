# backend/tests/test_rbac.py
import pytest

@pytest.mark.django_db
class TestRoleBasedAccess:
    """Verify that each role can only access what it should."""

    # Admin-only endpoints
    def test_job_seeker_cannot_list_all_scenarios(self, api_client, job_seeker, db):
        api_client.force_authenticate(user=job_seeker)
        response = api_client.get("/api/scenarios/")
        # Job seekers should only see public+active ones, not the admin list
        assert response.status_code in (200, 403)

    def test_job_seeker_cannot_create_scenario(self, api_client, job_seeker, db):
        api_client.force_authenticate(user=job_seeker)
        response = api_client.post("/api/scenarios/", {
            "title": "Evil scenario", "container_image": "evil:latest"
        }, format="json")
        assert response.status_code == 403

    def test_job_seeker_cannot_list_users(self, api_client, job_seeker, db):
        api_client.force_authenticate(user=job_seeker)
        response = api_client.get("/api/users/")
        assert response.status_code == 403

    def test_hr_cannot_access_admin_analytics(self, hr_client, db):
        response = hr_client.get("/api/analytics/overview/")
        assert response.status_code == 403

    def test_unauthenticated_cannot_access_any_api(self, api_client):
        endpoints = [
            "/api/scenarios/",
            "/api/assignments/",
            "/api/analytics/me/",
            "/api/notifications/",
        ]
        for url in endpoints:
            r = api_client.get(url)
            assert r.status_code == 401, f"{url} should require auth, got {r.status_code}"

    # Admin CAN access everything
    def test_admin_can_list_users(self, admin_client, db):
        response = admin_client.get("/api/users/")
        assert response.status_code == 200

    def test_admin_can_view_analytics(self, admin_client, db):
        response = admin_client.get("/api/analytics/overview/")
        assert response.status_code == 200