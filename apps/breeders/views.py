from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.core.permissions import IsAdminRole

from apps.breeders import services
from apps.breeders.models import Breeder, BreederMonthlyQuota
from apps.breeders.permissions import BreederPermission
from apps.breeders.serializers import BreederMonthlyQuotaSerializer, BreederSerializer


class BreederViewSet(viewsets.ModelViewSet):
    """
    /api/v1/breeders/ — CRUD for Breeder master data (STEP4 §PART A).
    ADMIN: full CRUD. CUSTOMER: read-only (list/retrieve), enforced by BreederPermission.
    """

    queryset = Breeder.objects.select_related('created_by').all()
    serializer_class = BreederSerializer
    permission_classes = (BreederPermission,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('status', 'breed')
    search_fields = ('name', 'breed', 'bloodline')
    ordering_fields = ('name', 'service_rate', 'service_start_date', 'created_at')
    ordering = ('-created_at',)

    def perform_create(self, serializer):
        breeder = services.create_breeder(validated_data=serializer.validated_data, created_by=self.request.user)
        serializer.instance = breeder

    def perform_update(self, serializer):
        breeder = services.update_breeder(instance=serializer.instance, validated_data=serializer.validated_data)
        serializer.instance = breeder

    def perform_destroy(self, instance):
        services.delete_breeder(instance=instance)


class BreederMonthlyQuotaViewSet(viewsets.ModelViewSet):
    """
    /api/v1/breeder-quotas/ (STEP19) — ADMIN-only management of per-(breeder, year,
    month) queue capacity. Previously only editable via Django admin; the same rows
    are also lazily created by apps.bookings.services.lock_booking_slot's
    get_or_create on first approval for a month if an admin never set one here.
    """

    queryset = BreederMonthlyQuota.objects.select_related('breeder').all()
    serializer_class = BreederMonthlyQuotaSerializer
    permission_classes = (IsAdminRole,)

    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filterset_fields = ('breeder', 'year', 'month', 'is_open')
    ordering_fields = ('year', 'month', 'created_at')
    ordering = ('-year', '-month')

    def perform_create(self, serializer):
        quota = services.create_breeder_monthly_quota(validated_data=serializer.validated_data)
        serializer.instance = quota

    def perform_update(self, serializer):
        quota = services.update_breeder_monthly_quota(
            instance=serializer.instance, validated_data=serializer.validated_data,
        )
        serializer.instance = quota

    def perform_destroy(self, instance):
        services.delete_breeder_monthly_quota(instance=instance)
