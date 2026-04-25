# backend/tests/conftest.py
from django.contrib.auth.models import AbstractUser
from rest_framework.test import APIClient
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def admin_user(db: None):
    return User.objects.create_superuser( username="admin", email="admin@test.com", password="testpass123", role="administrator" )

@pytest.fixture
def hr_user(db: None):
    return User.objects.create_user( username="hr1", email="hr@test.com", password="testpass123", role="hr_personnel" )

@pytest.fixture
def job_seeker(db: None):
    return User.objects.create_user( username="seeker1", email="seeker@test.com", password="testpass123", role="job_seeker" )

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def hr_client(api_client: APIClient, hr_user: AbstractUser):
    api_client.force_authenticate(user=hr_user)
    return api_client

@pytest.fixture
def admin_client(api_client: APIClient, admin_user: AbstractUser):
    api_client.force_authenticate(user=admin_user)
    return api_client