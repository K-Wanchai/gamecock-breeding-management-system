from rest_framework import serializers

from apps.bookings.models import Booking
from apps.payments.models import Payment


class _BookingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('id', 'booking_number', 'status', 'price', 'remaining_amount')


class PaymentSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create/approve/reject responses."""

    booking = _BookingSummarySerializer(read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'payment_number', 'booking', 'payment_type', 'amount', 'slip',
            'paid_at', 'status', 'verified_by', 'verified_at', 'remark',
            'created_at', 'updated_at',
        )
        read_only_fields = fields


class PaymentCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/payments — customer submits proof of payment for their own booking."""

    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())

    class Meta:
        model = Payment
        fields = ('booking', 'payment_type', 'amount', 'slip', 'paid_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('amount must be greater than 0.')
        return value


class PaymentReviewSerializer(serializers.Serializer):
    """Body for the approve/reject actions."""

    remark = serializers.CharField(required=False, allow_blank=True, max_length=255)


class PaymentResubmitSerializer(serializers.Serializer):
    """Body for the resubmit action — customer replaces slip on a REJECTED payment."""

    from apps.core.validators import validate_image_file as _validate_image

    slip = serializers.ImageField(validators=[_validate_image])
    paid_at = serializers.DateTimeField()
