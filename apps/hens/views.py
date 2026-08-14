from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsOwnerOrAdmin
from apps.hens import services
from apps.hens.models import Hen
from apps.hens.serializers import HenSerializer


class HenViewSet(viewsets.ModelViewSet):
    """
    /api/v1/hens/ — CRUD for Hen master data (STEP4 §PART B).
    CUSTOMER: full CRUD, but only on hens they own — the queryset is scoped to
    request.user and IsOwnerOrAdmin re-checks ownership per object (Global
    Rules #11-13, IDOR protection). ADMIN: sees and may manage every hen.
    """

    serializer_class = HenSerializer
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('status', 'breed')
    search_fields = ('name', 'breed', 'bloodline')
    ordering_fields = ('name', 'age_months', 'created_at')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Hen.objects.select_related('owner').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        hen = services.create_hen(validated_data=serializer.validated_data, owner=self.request.user)
        serializer.instance = hen

    def perform_update(self, serializer):
        hen = services.update_hen(instance=serializer.instance, validated_data=serializer.validated_data)
        serializer.instance = hen

    def perform_destroy(self, instance):
        services.delete_hen(instance=instance)
