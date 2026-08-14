from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.breeders import services
from apps.breeders.models import Breeder
from apps.breeders.permissions import BreederPermission
from apps.breeders.serializers import BreederSerializer


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
