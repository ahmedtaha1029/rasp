import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

@pytest.mark.django_db
class TestLoginRateLimit:
    def test_sixth_login_attempt_returns_429(self):
        client = APIClient()
        url = "/api/auth/login/"
        for _ in range(5):
            client.post(url, {"username": "x", "password": "x"}, format="json")
        response = client.post(url, {"username": "x", "password": "x"}, format="json")
        assert response.status_code == 429

    def test_valid_login_returns_200(self, db):
        cache.clear()

        from django.contrib.auth import get_user_model
        User = get_user_model()
        User.objects.create_user(username="valid", password="ValidPass123!", role="job_seeker")
        client = APIClient()
        response = client.post(
            "/api/auth/login/",
            {"username": "valid", "password": "ValidPass123!"},
            format="json"
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        
        