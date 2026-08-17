"""
Views for the STEP9 Dashboard, the 7 business reports, and cross-entity Search.
Reports are ADMIN-only (apps.core.permissions.IsAdminRole, reused — no new
permission class needed); Dashboard and Search are IsAuthenticated with the
role/ownership scoping done in get_queryset()/services, matching the pattern
every other app in this project already uses (see e.g. BookingViewSet).
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.breeding.models import BreedingEvent, Egg
from apps.chicks.models import Chick
from apps.core.permissions import IsAdminRole
from apps.hatching.models import Hatching
from apps.payments.models import Payment

from apps.reports import services
from apps.reports.filters import (
    BookingReportFilter, BookingSearchFilter, BreedingReportFilter, ChickReportFilter, EggReportFilter,
    HatchingReportFilter, PaymentReportFilter, RevenueReportFilter,
)
from apps.reports.serializers import (
    BookingReportSerializer, BookingSearchResultSerializer, BreedingReportSerializer, ChickReportSerializer,
    EggReportSerializer, HatchingReportSerializer, PaymentReportSerializer,
)


class BaseReportView(generics.ListAPIView):
    """
    Shared shape for every report: ADMIN-only, filterable (django-filter) +
    orderable (OrderingFilter), and returns the standard DRF paginated envelope
    (count/next/previous/results) with an extra `summary` key computed from the
    filtered-but-unpaginated queryset (get_summary()) — never from the current
    page alone, so the summary reflects the whole filtered result set.
    """

    permission_classes = (IsAdminRole,)
    filter_backends = (DjangoFilterBackend, OrderingFilter)

    def get_summary(self, queryset):
        raise NotImplementedError

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        summary = self.get_summary(queryset)

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        response = self.get_paginated_response(serializer.data) if page is not None else Response({'results': serializer.data})
        response.data['summary'] = summary
        return response


class BookingReportView(BaseReportView):
    queryset = Booking.objects.select_related('customer', 'hen', 'breeder').all()
    serializer_class = BookingReportSerializer
    filterset_class = BookingReportFilter
    ordering_fields = ('booking_date', 'created_at', 'price')
    ordering = ('-booking_date',)

    def get_summary(self, queryset):
        return services.booking_summary(queryset)


class PaymentReportView(BaseReportView):
    queryset = Payment.objects.select_related('booking', 'booking__customer', 'booking__breeder').all()
    serializer_class = PaymentReportSerializer
    filterset_class = PaymentReportFilter
    ordering_fields = ('paid_at', 'verified_at', 'amount')
    ordering = ('-paid_at',)

    def get_summary(self, queryset):
        return services.payment_summary(queryset)


class RevenueReportView(BaseReportView):
    queryset = Payment.objects.filter(status=Payment.Status.APPROVED).select_related(
        'booking', 'booking__customer', 'booking__breeder',
    )
    serializer_class = PaymentReportSerializer
    filterset_class = RevenueReportFilter
    ordering_fields = ('verified_at', 'amount')
    ordering = ('-verified_at',)

    def get_summary(self, queryset):
        return services.revenue_summary(queryset)


class BreedingReportView(BaseReportView):
    queryset = BreedingEvent.objects.select_related('booking', 'booking__customer', 'booking__breeder').all()
    serializer_class = BreedingReportSerializer
    filterset_class = BreedingReportFilter
    ordering_fields = ('event_date', 'created_at')
    ordering = ('-event_date',)

    def get_summary(self, queryset):
        return services.breeding_summary(queryset)


class EggReportView(BaseReportView):
    queryset = Egg.objects.select_related('booking', 'booking__customer', 'booking__breeder').all()
    serializer_class = EggReportSerializer
    filterset_class = EggReportFilter
    ordering_fields = ('egg_date', 'total_eggs')
    ordering = ('-egg_date',)

    def get_summary(self, queryset):
        return services.egg_summary(queryset)


class HatchingReportView(BaseReportView):
    queryset = Hatching.objects.select_related(
        'egg', 'egg__booking', 'egg__booking__customer', 'egg__booking__breeder',
    ).all()
    serializer_class = HatchingReportSerializer
    filterset_class = HatchingReportFilter
    ordering_fields = ('started_at', 'completed_at')
    ordering = ('-started_at',)

    def get_summary(self, queryset):
        return services.hatching_summary(queryset)


class ChickReportView(BaseReportView):
    queryset = Chick.objects.select_related('booking', 'booking__customer', 'booking__breeder').all()
    serializer_class = ChickReportSerializer
    filterset_class = ChickReportFilter
    ordering_fields = ('birth_date', 'created_at')
    ordering = ('-birth_date',)

    def get_summary(self, queryset):
        return services.chick_summary(queryset)


class DashboardView(APIView):
    """
    GET /api/v1/dashboard/ (STEP9). Any authenticated user may call this — the
    "permission" here is the role-scoped payload itself (apps.reports.services.
    get_dashboard_data): ADMIN gets farm-wide figures, CUSTOMER gets only their
    own bookings/hens/chicks/payments.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        data = services.get_dashboard_data(user=request.user)
        data['recent_bookings'] = BookingReportSerializer(data['recent_bookings'], many=True).data
        return Response(data)


class SearchView(generics.ListAPIView):
    """
    GET /api/v1/search/ (STEP9). ค้นหา: Booking Number, Customer, Hen, Breeder,
    Wing Clip Number, Date — via BookingSearchFilter (precise per-field
    filtering) and/or a single `?search=` free-text query (SearchFilter).
    Pagination/ordering reuse the project's existing global DRF settings — no
    new pagination class needed. Ownership-scoped exactly like every other
    list endpoint: CUSTOMER only ever sees their own bookings.
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = BookingSearchResultSerializer
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = BookingSearchFilter
    search_fields = ('booking_number', 'hen__name', 'breeder__name', 'customer__username', 'chicks__wing_clip_number')
    ordering_fields = ('booking_date', 'created_at', 'booking_number')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Booking.objects.select_related('customer', 'hen', 'breeder').prefetch_related('chicks').distinct()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(customer=user)
