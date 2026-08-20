from rest_framework import serializers

from apps.bookings.models import Booking
from apps.chicks.models import Chick
from apps.notifications.models import Notification


class _UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _BookingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('id', 'booking_number')


class _ChickSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Chick
        fields = ('id', 'wing_clip_number')


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only — Notification rows are only ever created by the service layer
    (apps.notifications.services), never accepted as client input."""

    user = _UserSummarySerializer(read_only=True)
    booking = _BookingSummarySerializer(read_only=True)
    chick = _ChickSummarySerializer(read_only=True)

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
