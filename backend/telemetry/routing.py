"""
telemetry/routing.py

WebSocket URL patterns for the telemetry consumer.

Registered in rasp_backend/asgi.py under the 'websocket' protocol.

URL pattern: ws://host/ws/telemetry/{session_id}/

session_id is a UUID — using str type in the path converter since
Django's <uuid:pk> converter normalizes the format but the consumer
works with the raw string value.
"""

from django.urls import re_path

from .consumers import TelemetryConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/telemetry/(?P<session_id>[0-9a-f-]{36})/$",
        TelemetryConsumer.as_asgi(),
    ),
]