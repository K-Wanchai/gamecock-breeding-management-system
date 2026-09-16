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
    latest_breeding_status = serializers.SerializerMethodField()

    def get_latest_breeding_status(self, obj):
        events = list(obj.breeding_events.all())  # uses prefetch cache when available
        return events[-1].status if events else None

    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer', 'hen', 'breeder',
            'booking_date', 'booking_year', 'booking_month', 'queue_no',
            'price', 'deposit_amount', 'paid_amount', 'remaining_amount',
            'status', 'current_breeding_stage', 'latest_breeding_status', 'note',
            'hen_brooding', 'brooding_started_at', 'clip_ready',
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


# ---------------------------------------------------------------------------
# Timeline (STEP_TIMELINE) — customer-facing read-only endpoint
# ---------------------------------------------------------------------------

class _TimelineInseminationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    session_number = serializers.IntegerField()
    record_date = serializers.DateField()
    note = serializers.CharField()
    created_at = serializers.DateTimeField()


class _TimelineBreedingEventSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    event_date = serializers.DateField()
    description = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()

    def get_status_display(self, obj):
        return obj.get_status_display()


class _TimelineEggSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    total_eggs = serializers.IntegerField()
    good_eggs = serializers.IntegerField()
    bad_eggs = serializers.IntegerField()
    good_egg_rate = serializers.SerializerMethodField()
    egg_date = serializers.DateField()
    incubation_date = serializers.DateField(allow_null=True)
    remark = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()

    def get_good_egg_rate(self, obj):
        from decimal import ROUND_HALF_UP, Decimal
        if obj.total_eggs == 0:
            return '0.00'
        rate = Decimal(obj.good_eggs) / Decimal(obj.total_eggs) * Decimal('100')
        return str(rate.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


class BookingTimelineSerializer(serializers.Serializer):
    """
    GET /api/v1/bookings/{id}/timeline/ — combined timeline for a single booking.
    Returns the booking header, all breeding-stage events in chronological order,
    and all egg-laying records in chronological order so a customer can track
    their hen's progress without making separate requests.
    """

    id = serializers.IntegerField()
    booking_number = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    hen = _HenSummarySerializer()
    breeder = _BreederSummarySerializer()
    booking_date = serializers.DateField()
    queue_no = serializers.IntegerField(allow_null=True)
    hen_brooding = serializers.BooleanField()
    brooding_started_at = serializers.DateTimeField(allow_null=True)
    inseminations = _TimelineInseminationSerializer(many=True)
    eggs = _TimelineEggSerializer(many=True)
    current_breeding_stage = serializers.SerializerMethodField()
    breeding_events = _TimelineBreedingEventSerializer(many=True)

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_current_breeding_stage(self, obj):
        events = list(obj.breeding_events.all())
        if not events:
            return None
        last = events[-1]
        return {
            'status': last.status,
            'status_display': last.get_status_display(),
            'event_date': str(last.event_date),
        }
