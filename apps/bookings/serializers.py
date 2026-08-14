from rest_framework import serializers

from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.hens.models import Hen


class _HenSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Hen
        fields = ('id', 'name', 'breed')


class _BreederSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Breeder
        fields = ('id', 'name', 'breed', 'service_rate')


class _CustomerSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class BookingSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create/approve/cancel responses."""

    hen = _HenSummarySerializer(read_only=True)
    breeder = _BreederSummarySerializer(read_only=True)
    customer = _CustomerSummarySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer', 'hen', 'breeder',
            'booking_date', 'booking_year', 'booking_month', 'queue_no',
            'price', 'deposit_amount', 'paid_amount', 'remaining_amount',
            'status', 'current_breeding_stage', 'note',
            'requested_at', 'approved_at', 'locked_at', 'cancelled_at', 'cancel_reason',
            'created_at', 'updated_at',
        )
        read_only_fields = fields


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/v1/bookings — customer picks a breeder + one of their own hens + a date.
    price/deposit_amount/status/booking_number are always computed server-side
    (Critical Rule #15: a customer must never set their own price).
    """

    hen = serializers.PrimaryKeyRelatedField(queryset=Hen.objects.all())
    breeder = serializers.PrimaryKeyRelatedField(queryset=Breeder.objects.all())

    class Meta:
        model = Booking
        fields = ('hen', 'breeder', 'booking_date', 'note')


class BookingCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)
