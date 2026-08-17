from django.utils import timezone
from rest_framework import serializers

from apps.breeders.models import Breeder, BreederMonthlyQuota


class BreederSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for Breeder (STEP4 §PART A). `created_by` is always taken
    from the authenticated admin in the view/service, never from client input
    (Global Rule #11), so it is read-only here.
    """

    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    remaining_quota_this_month = serializers.SerializerMethodField()

    class Meta:
        model = Breeder
        fields = (
            'id', 'name', 'breed', 'bloodline', 'description', 'image',
            'service_rate', 'default_monthly_quota', 'status', 'service_start_date',
            'created_by', 'created_by_username', 'remaining_quota_this_month', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def get_remaining_quota_this_month(self, obj: Breeder) -> int:
        """
        STEP14: the customer-facing breeder list needs a "spots left" indicator before
        booking. A slot is only actually consumed at admin-approval time
        (apps.bookings.services.lock_booking_slot sets queue_no) — not at booking
        creation — so this mirrors that same rule: max_slots for the current month
        (BreederMonthlyQuota row if one exists yet, else the breeder's
        default_monthly_quota) minus bookings that already have a queue_no this month.
        Read-only and computed fresh on every request; deliberately does not create a
        BreederMonthlyQuota row as a side effect of a GET like lock_booking_slot's
        get_or_create does — that only happens for real at approval time.
        """
        from apps.bookings.models import Booking  # local import: avoids a load-time cycle with bookings.models

        today = timezone.localdate()
        quota = BreederMonthlyQuota.objects.filter(breeder=obj, year=today.year, month=today.month).first()
        max_slots = quota.max_slots if quota else obj.default_monthly_quota
        if quota is not None and not quota.is_open:
            return 0
        locked_count = Booking.objects.filter(
            breeder=obj, booking_year=today.year, booking_month=today.month, queue_no__isnull=False,
        ).count()
        return max(max_slots - locked_count, 0)

    def validate_service_rate(self, value):
        # DB also enforces this (ck_breeder_service_rate_gte_0) — checked here too so a
        # bad value gets a clean 400 instead of falling through to a raw IntegrityError
        # (Global Rule #20: app validation must not rely on the DB constraint alone).
        if value < 0:
            raise serializers.ValidationError('service_rate must be greater than or equal to 0.')
        return value

    def validate_default_monthly_quota(self, value):
        if value < 0:
            raise serializers.ValidationError('default_monthly_quota must be greater than or equal to 0.')
        return value


class BreederMonthlyQuotaSerializer(serializers.ModelSerializer):
    """
    STEP19 — admin-facing CRUD for BreederMonthlyQuota. Previously only reachable via
    Django admin; apps.bookings.services.lock_booking_slot's get_or_create is the only
    other writer (creates a row lazily at first approval for a month using
    Breeder.default_monthly_quota if the admin never set one explicitly here).
    """

    breeder_name = serializers.CharField(source='breeder.name', read_only=True)
    remaining_slots = serializers.SerializerMethodField()

    class Meta:
        model = BreederMonthlyQuota
        fields = (
            'id', 'breeder', 'breeder_name', 'year', 'month', 'max_slots', 'is_open',
            'remaining_slots', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_remaining_slots(self, obj: BreederMonthlyQuota) -> int:
        from apps.bookings.models import Booking  # local import: avoids a load-time cycle with bookings.models

        if not obj.is_open:
            return 0
        locked_count = Booking.objects.filter(
            breeder=obj.breeder, booking_year=obj.year, booking_month=obj.month, queue_no__isnull=False,
        ).count()
        return max(obj.max_slots - locked_count, 0)

    def validate_year(self, value):
        if value < 2000:
            raise serializers.ValidationError('year must be 2000 or later.')
        return value

    def validate_month(self, value):
        if not (1 <= value <= 12):
            raise serializers.ValidationError('month must be between 1 and 12.')
        return value

    def validate_max_slots(self, value):
        if value < 0:
            raise serializers.ValidationError('max_slots must be greater than or equal to 0.')
        return value
