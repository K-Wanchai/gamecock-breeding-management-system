from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.hatching import services
from apps.hatching.models import Hatching
from apps.hatching.permissions import HatchingWritePermission
from apps.hatching.serializers import HatchingCompleteSerializer, HatchingSerializer, HatchingStartSerializer


class HatchingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/hatchings/ (STEP7). ADMIN writes, CUSTOMER reads only their own booking's
    hatching batches. create = start a batch; complete = record its final counts.
    No update/delete endpoint — corrections happen through the complete action's
    business-rule-checked path, not free-form edits.
    """

    permission_classes = (HatchingWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('egg', 'egg__booking', 'status')
    search_fields = ('egg__booking__booking_number',)
    ordering_fields = ('started_at', 'created_at')
    ordering = ('-started_at', '-id')

    def get_queryset(self):
        queryset = Hatching.objects.select_related('egg', 'egg__booking', 'egg__booking__customer', 'recorded_by').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(egg__booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return HatchingStartSerializer
        if self.action == 'complete':
            return HatchingCompleteSerializer
        return HatchingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hatching = services.start_hatching(
            egg_id=serializer.validated_data['egg'].id,
            started_at=serializer.validated_data['started_at'],
            remark=serializer.validated_data.get('remark', ''),
            recorded_by=request.user,
        )
        return Response(HatchingSerializer(hatching).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        hatching = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hatching = services.complete_hatching(
            hatching_id=hatching.id,
            completed_at=serializer.validated_data['completed_at'],
            hatched_count=serializer.validated_data['hatched_count'],
            failed_count=serializer.validated_data.get('failed_count', 0),
            survival_count=serializer.validated_data.get('survival_count', 0),
            remark=serializer.validated_data.get('remark', ''),
            actor=request.user,
        )
        return Response(HatchingSerializer(hatching).data)
