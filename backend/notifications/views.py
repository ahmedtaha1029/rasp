from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache

from notifications.models import Notification
from notifications.serializers import (
    NotificationBulkMarkReadSerializer,
    NotificationSerializer,
)


class NotificationListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        return qs

    def list(self, request, *args, **kwargs):
        cache_key = f"notifications:{request.user.pk}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=15)  # 15s cache
        return response


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request: Request, pk: int) -> Response:
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.mark_read()
        return Response({"detail": "Marked as read."}, status=status.HTTP_200_OK)


class NotificationBulkMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = NotificationBulkMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data.get("notification_ids", [])
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if ids:
            qs = qs.filter(pk__in=ids)
        updated = qs.update(is_read=True)
        return Response(
            {"detail": f"{updated} notification(s) marked as read."},
            status=status.HTTP_200_OK,
        )