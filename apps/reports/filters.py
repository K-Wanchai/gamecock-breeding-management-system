"""
FilterSets for the STEP9 reports and search endpoints. Every report shares the
same shape — an optional booking_date-family date_from/date_to range plus
status/breeder/customer — per the spec ("รองรับ: Date Range, Status, Breeder,
Customer"). breeder/customer are plain id filters (NumberFilter), matching how
every other list endpoint in this project accepts FK filters (see e.g.
BookingViewSet.filterset_fields = ('status', 'breeder', ...) — django-filter's
auto-generated FK filter is also an id lookup).
"""

import django_filters

from apps.bookings.models import Booking
from apps.breeding.models import BreedingEvent, Egg
from apps.chicks.models import Chick
from apps.hatching.models import Hatching
from apps.payments.models import Payment


class BookingReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='booking_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='booking_date', lookup_expr='lte')

    class Meta:
        model = Booking
        fields = ['status', 'breeder', 'customer']


class PaymentReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='paid_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='paid_at', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='booking__breeder')
    customer = django_filters.NumberFilter(field_name='booking__customer')

    class Meta:
        model = Payment
        fields = ['status', 'payment_type']


class RevenueReportFilter(django_filters.FilterSet):
    """No `status` filter — the view's base queryset is already fixed to
    Payment.Status.APPROVED, since revenue means money actually collected."""

    date_from = django_filters.DateFilter(field_name='verified_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='verified_at', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='booking__breeder')
    customer = django_filters.NumberFilter(field_name='booking__customer')

    class Meta:
        model = Payment
        fields = []


class BreedingReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='event_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='event_date', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='booking__breeder')
    customer = django_filters.NumberFilter(field_name='booking__customer')

    class Meta:
        model = BreedingEvent
        fields = ['status']


class EggReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='egg_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='egg_date', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='booking__breeder')
    customer = django_filters.NumberFilter(field_name='booking__customer')

    class Meta:
        model = Egg
        fields = []


class HatchingReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='started_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='started_at', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='egg__booking__breeder')
    customer = django_filters.NumberFilter(field_name='egg__booking__customer')

    class Meta:
        model = Hatching
        fields = ['status']


class ChickReportFilter(django_filters.FilterSet):
    """breeder/customer filter through the denormalized Chick.booking FK, which
    apps.chicks.models.Chick's own docstring documents as existing specifically
    for "cheap filtering/reporting" (never for ownership decisions)."""

    date_from = django_filters.DateFilter(field_name='birth_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='birth_date', lookup_expr='lte')
    breeder = django_filters.NumberFilter(field_name='booking__breeder')
    customer = django_filters.NumberFilter(field_name='booking__customer')

    class Meta:
        model = Chick
        fields = ['status', 'gender']


class BookingSearchFilter(django_filters.FilterSet):
    """STEP9 Search — ค้นหา: Booking Number, Customer, Hen, Breeder, Wing Clip
    Number, Date. Each field is a partial (icontains) match; combine with the
    free-text `?search=` param (SearchFilter, wired in SearchView) for a single
    query box, or use these for precise per-field filtering."""

    booking_number = django_filters.CharFilter(lookup_expr='icontains')
    customer = django_filters.CharFilter(field_name='customer__username', lookup_expr='icontains')
    hen = django_filters.CharFilter(field_name='hen__name', lookup_expr='icontains')
    breeder = django_filters.CharFilter(field_name='breeder__name', lookup_expr='icontains')
    wing_clip_number = django_filters.CharFilter(field_name='chicks__wing_clip_number', lookup_expr='icontains')
    date_from = django_filters.DateFilter(field_name='booking_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='booking_date', lookup_expr='lte')

    class Meta:
        model = Booking
        fields = []
