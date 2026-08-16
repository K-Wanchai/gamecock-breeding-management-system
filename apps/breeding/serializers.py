from rest_framework import serializers

from apps.bookings.models import Booking

from apps.breeding.models import BreedingEvent, Egg
from apps.breeding.services import calculate_good_egg_rate


class _RecordedBySummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _BookingSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('id', 'booking_number', 'status')


class BreedingEventSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create responses."""

    booking = _BookingSummarySerializer(read_only=True)
    recorded_by = _RecordedBySummarySerializer(read_only=True)

    class Meta:
        model = BreedingEvent
        fields = ('id', 'booking', 'status', 'event_date', 'description', 'recorded_by', 'created_at', 'updated_at')
        read_only_fields = fields


class BreedingEventCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/v1/breeding-events — ADMIN only (Global Rule #11: the acting admin
    is always request.user, never client-supplied). booking is the only writable
    relation; status/event_date/description are validated further in
    apps.breeding.services.record_breeding_event (allowed-transition + date rules).
    """

    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())

    class Meta:
        model = BreedingEvent
        fields = ('booking', 'status', 'event_date', 'description')


class EggSerializer(serializers.ModelSerializer):
    """Read representation for list/retrieve/create responses."""

    booking = _BookingSummarySerializer(read_only=True)
    recorded_by = _RecordedBySummarySerializer(read_only=True)
    good_egg_rate = serializers.SerializerMethodField()

    class Meta:
        model = Egg
        fields = (
            'id', 'booking', 'total_eggs', 'good_eggs', 'bad_eggs', 'good_egg_rate',
            'egg_date', 'incubation_date', 'remark', 'recorded_by', 'created_at', 'updated_at',
        )
        read_only_fields = fields

    def get_good_egg_rate(self, obj):
        return str(calculate_good_egg_rate(obj))


class EggCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/eggs — ADMIN only. Count/date sanity rules are re-checked in
    apps.breeding.services.record_egg (Global Rule #17)."""

    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all())
    good_eggs = serializers.IntegerField(min_value=0, required=False, default=0)
    bad_eggs = serializers.IntegerField(min_value=0, required=False, default=0)

    class Meta:
        model = Egg
        fields = ('booking', 'total_eggs', 'good_eggs', 'bad_eggs', 'egg_date', 'incubation_date', 'remark')

    def validate_total_eggs(self, value):
        if value < 0:
            raise serializers.ValidationError('total_eggs must not be negative.')
        return value

    def validate(self, attrs):
        good = attrs.get('good_eggs', 0)
        bad = attrs.get('bad_eggs', 0)
        total = attrs.get('total_eggs', 0)
        if good + bad > total:
            raise serializers.ValidationError('good_eggs + bad_eggs must not exceed total_eggs.')
        return attrs
