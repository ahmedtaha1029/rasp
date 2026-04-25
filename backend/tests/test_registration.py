# test_registration.py — updated relevant tests
import pytest
from django.core.cache import cache

@pytest.mark.django_db
class TestRegistration:
    def setup_method(self):
        """Clear throttle cache before each test."""
        cache.clear()

    def test_register_job_seeker(self, api_client, db):
        response = api_client.post("/api/auth/register/", {
            "email": "new@test.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "job_seeker"
        }, format="json")
        assert response.status_code == 201

    def test_register_hr_personnel(self, api_client, db):
        response = api_client.post("/api/auth/register/", {
            "email": "hr@test.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "hr_personnel"
        }, format="json")
        assert response.status_code == 201

    def test_register_rejects_mismatched_passwords(self, api_client, db):
        response = api_client.post("/api/auth/register/", {
            "email": "bad@test.com",
            "password": "StrongPass123!",
            "confirm_password": "DifferentPass!",
            "role": "job_seeker"
        }, format="json")
        assert response.status_code == 400

    def test_register_rejects_duplicate_email(self, api_client, hr_user, db):
        response = api_client.post("/api/auth/register/", {
            "email": hr_user.email,
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "job_seeker"
        }, format="json")
        assert response.status_code == 400

    def test_register_rejects_administrator_role(self, api_client, db):
        response = api_client.post("/api/auth/register/", {
            "email": "evil@test.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "role": "administrator"
        }, format="json")
        assert response.status_code == 400

    def test_jwt_token_contains_role_claim(self, api_client, hr_user, db):
        import jwt as pyjwt
        response = api_client.post("/api/auth/login/", {
            "username": hr_user.username, "password": "testpass123"
        }, format="json")
        assert response.status_code == 200
        payload = pyjwt.decode(response.data["access"], options={"verify_signature": False})
        assert payload.get("role") == "hr_personnel"