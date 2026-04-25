"""
telemetry/views.py

Read-only endpoints for user action history and event logs.
The actual telemetry writing happens through the WebSocket consumer
(telemetry/consumers.py), not through REST endpoints.
"""

from rest_framework import generics, permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdministrator
from .models import EventLog, UserAction
from .serializers import UserActionSerializer


class UserActionListView(generics.ListAPIView):
    """
    GET /api/telemetry/actions/?session_id={uuid}

    Returns all scored user actions for a session.
    Admins can query any session; participants only their own.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserActionSerializer

    def get_queryset(self):
        session_id = self.request.query_params.get("session_id")
        qs = UserAction.objects.select_related("stage").all()

        if not self.request.user.is_administrator:
            qs = qs.filter(session__user=self.request.user)

        if session_id:
            qs = qs.filter(session_id=session_id)

        return qs.order_by("created_at")


class UserActionDetailView(generics.RetrieveAPIView):
    """
    GET /api/telemetry/actions/{id}/
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserActionSerializer

    def get_queryset(self):
        if self.request.user.is_administrator:
            return UserAction.objects.all()
        return UserAction.objects.filter(session__user=self.request.user)