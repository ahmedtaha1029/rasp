import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "rasp_backend.settings")

# This must happen before any app imports
django_asgi_app = get_asgi_application()

# Only import routing AFTER django.setup() has been called
from channels.routing import ProtocolTypeRouter, URLRouter
from rasp_backend.middleware.channels_jwt import JWTAuthMiddleware
import telemetry.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            telemetry.routing.websocket_urlpatterns
        )
    ),
})