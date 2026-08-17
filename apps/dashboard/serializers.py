from rest_framework import serializers

from apps.bookings.models import Booking


class DashboardSummarySerializer(serializers.Serializer):
    booking_counts = serializers.DictField(child=serializers.IntegerField())
    chick_count = serializers.IntegerField()
    outstanding_payment_total = serializers.DecimalField(max_digits=12, decimal_places=2)

    def validate_booking_counts(self, value):
        # Not client input (this serializer is only ever used to shape a response), but
        # documents the exact keys the field always carries for anyone reading the schema.
        expected_keys = {status.value for status in Booking.Status}
        assert set(value.keys()) == expected_keys
        return value
