# containers/tokens.py
from rest_framework_simplejwt.tokens import Token

class ContainerWSToken(Token):
    token_type = "container_ws"
    lifetime_override = None

    from datetime import timedelta
    lifetime = timedelta(hours=6)