from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import TokenError

from containers.tokens import ContainerWSToken

@database_sync_to_async
def get_user_from_token(token):
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from users.models import User
        validated = AccessToken(token)
        return User.objects.get(id=validated["user_id"])
    except (TokenError, User.DoesNotExist):
        # 2. If AccessToken fails, try ContainerWSToken
        try:
            validated = ContainerWSToken(token)
            return User.objects.get(id=validated["user_id"])
        except (TokenError, User.DoesNotExist, Exception):
            # 3. Fallback to Anonymous if both fail
            return AnonymousUser()

class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()
        return await self.app(scope, receive, send)