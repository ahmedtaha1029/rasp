import pytest
from datetime import timedelta
from containers.tokens import ContainerWSToken

@pytest.mark.django_db
class TestContainerWSToken:
    def test_token_lifetime_is_six_hours(self, hr_user):
        token = ContainerWSToken.for_user(hr_user)
        assert token.lifetime == timedelta(hours=6)

    def test_token_type_is_container_ws(self, hr_user):
        token = ContainerWSToken.for_user(hr_user)
        assert token.token_type == "container_ws"

    def test_token_can_be_decoded(self, hr_user):
        token = ContainerWSToken.for_user(hr_user)
        decoded = ContainerWSToken(str(token))
        assert decoded["user_id"] == str(hr_user.id)