"""
Read-only, flattened serializers for the STEP9 report rows and dashboard/search
payloads. Every nested `source=` lookup here relies on the corresponding
view's queryset already select_related()-ing that relationship (Global Rule
#41 N+1 avoidance) — see apps/reports/views.py.
"""

from rest_framework import serializers

from apps.bookings.models import Booking
from apps.breeding.models import BreedingEvent, Egg
from apps.chicks.models import Chick
from apps.hatching.models import Hatching
from apps.payments.models import Payment


class BookingReportSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='customer.username', read_only=True)
    hen = serializers.CharField(source='hen.name', read_only=True)
    breeder = serializers.CharField(source='breeder.name', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer', 'hen', 'breeder', 'booking_date',
            'status', 'price', 'paid_amount', 'remaining_amount', 'created_at',
        )


class PaymentReportSerializer(serializers.ModelSerializer):
    booking_number = serializers.CharField(source='booking.booking_number', read_only=True)
    customer = serializers.CharField(source='booking.customer.username', read_only=True)
    breeder = serializers.CharField(source='booking.breeder.name', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'payment_number', 'booking_number', 'customer', 'breeder',
            'payment_type', 'amount', 'status', 'paid_at', 'verified_at',
        )


class BreedingReportSerializer(serializers.ModelSerializer):
    booking_number = serializers.CharField(source='booking.booking_number', read_only=True)
    customer = serializers.CharField(source='booking.customer.username', read_only=True)
    breeder = serializers.CharField(source='booking.breeder.name', read_only=True)

    class Meta:
        model = BreedingEvent
        fields = ('id', 'booking_number', 'customer', 'breeder', 'status', 'event_date', 'description')


class EggReportSerializer(serializers.ModelSerializer):
    booking_number = serializers.CharField(source='booking.booking_number', read_only=True)
    customer = serializers.CharField(source='booking.customer.username', read_only=True)
    breeder = serializers.CharField(source='booking.breeder.name', read_only=True)
    good_egg_rate = serializers.SerializerMethodField()

    class Meta:
        model = Egg
        fields = (
            'id', 'booking_number', 'customer', 'breeder', 'total_eggs', 'good_eggs',
            'bad_eggs', 'good_egg_rate', 'egg_date', 'incubation_date',
        )

    def get_good_egg_rate(self, obj):
        from apps.breeding.services import calculate_good_egg_rate
        return calculate_good_egg_rate(obj)


class HatchingReportSerializer(serializers.ModelSerializer):
    booking_number = serializers.CharField(source='egg.booking.booking_number', read_only=True)
    customer = serializers.CharField(source='egg.booking.customer.username', read_only=True)
    breeder = serializers.CharField(source='egg.booking.breeder.name', read_only=True)
    hatching_rate = serializers.SerializerMethodField()

    class Meta:
        model = Hatching
        fields = (
            'id', 'booking_number', 'customer', 'breeder', 'total_eggs', 'hatched_count',
            'failed_count', 'survival_count', 'hatching_rate', 'status', 'started_at', 'completed_at',
        )

    def get_hatching_rate(self, obj):
        from apps.hatching.services import calculate_hatching_rate
        return calculate_hatching_rate(obj)


class ChickReportSerializer(serializers.ModelSerializer):
    booking_number = serializers.CharField(source='booking.booking_number', read_only=True)
    customer = serializers.CharField(source='booking.customer.username', read_only=True)
    breeder = serializers.CharField(source='booking.breeder.name', read_only=True)

    class Meta:
        model = Chick
        fields = (
            'id', 'wing_clip_number', 'name', 'booking_number', 'customer', 'breeder',
            'gender', 'status', 'birth_date',
        )


class BookingSearchResultSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='customer.username', read_only=True)
    hen = serializers.CharField(source='hen.name', read_only=True)
    breeder = serializers.CharField(source='breeder.name', read_only=True)
    wing_clip_numbers = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ('id', 'booking_number', 'customer', 'hen', 'breeder', 'booking_date', 'status', 'wing_clip_numbers')

    def get_wing_clip_numbers(self, obj):
        # Relies on the view's queryset .prefetch_related('chicks') — iterating the
        # already-prefetched cache here, not a fresh per-row query (Global Rule #41).
        return [chick.wing_clip_number for chick in obj.chicks.all()]
