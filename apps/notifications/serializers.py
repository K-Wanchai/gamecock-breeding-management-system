from rest_framework import serializers

<<<<<<< HEAD
from apps.bookings.models import Booking
from apps.chicks.models import Chick
from apps.notifications.models import LineLinkCode, Notification


class _BookingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('id', 'booking_number')


class _ChickSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Chick
        fields = ('id', 'wing_clip_number')


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only inbox representation — Notification rows are only ever written by other services, never by a client."""

    booking = _BookingSummarySerializer(read_only=True)
    chick = _ChickSummarySerializer(read_only=True)
=======
from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only — Notification rows are only ever created by the service layer
    (apps.notifications.services), never accepted as client input."""
>>>>>>> origin/main

    class Meta:
        model = Notification
        fields = (
<<<<<<< HEAD
            'id', 'channel', 'notif_type', 'booking', 'chick', 'message', 'status', 'sent_at', 'created_at',
=======
            'id', 'user', 'channel', 'notif_type', 'booking', 'chick', 'message',
            'status', 'sent_at', 'error_note', 'retry_count', 'created_at', 'updated_at',
>>>>>>> origin/main
        )
        read_only_fields = fields


<<<<<<< HEAD
class LineLinkCodeSerializer(serializers.ModelSerializer):
    """Response body for POST /notifications/line/link-code/ — code + when it stops being valid."""

    class Meta:
        model = LineLinkCode
        fields = ('code', 'expires_at')
        read_only_fields = fields
=======
class LineLinkCodeSerializer(serializers.Serializer):
    code = serializers.CharField()
    expires_at = serializers.DateTimeField()
>>>>>>> origin/main
