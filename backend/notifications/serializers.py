"""
notifications/serializers.py

Serializers for user-facing notifications (FR-25).

Notification records are user-facing UI elements — not analytics logs —
so referencing the user by FK is acceptable here. No behavioral or
detection data is included.
"""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Read serializer for the notification feed in user dashboards.
    Used by both HR Personnel and Job Seeker role dashboards.
    """

    notification_type_display = serializers.CharField(
        source="get_notification_type_display", read_only=True
    )
    scenario_title = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "message",
            "scenario",
            "scenario_title",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_scenario_title(self, obj: Notification) -> str | None:
        if obj.scenario:
            return obj.scenario.title
        return None


class NotificationMarkReadSerializer(serializers.Serializer):
    """
    PATCH /api/notifications/{id}/read/

    Marks one notification as read. The view restricts this to
    the owning user only.
    """

    # No body fields needed — the action is inferred from the endpoint.
    pass


class NotificationBulkMarkReadSerializer(serializers.Serializer):
    """
    POST /api/notifications/read-all/

    Marks all unread notifications as read for the requesting user.
    """

    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
        help_text=(
            "Optional list of specific notification IDs to mark read. "
            "If omitted, all unread notifications for the user are marked."
        ),
    )