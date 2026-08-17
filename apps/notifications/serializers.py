from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only — Notification rows are only ever created by the service layer
    (apps.notifications.services), never accepted as client input."""

    class Meta:
        model = Notification
        fields = (
            'id', 'user', 'channel', 'notif_type', 'booking', 'chick', 'message',
            'status', 'sent_at', 'error_note', 'retry_count', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class LineLinkCodeSerializer(serializers.Serializer):
    code = serializers.CharField()
    expires_at = serializers.DateTimeField()
