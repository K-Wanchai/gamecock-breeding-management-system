from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.health import services
from apps.health.models import HealthRecord
from apps.health.permissions import HealthWritePermission
from apps.health.serializers import HealthRecordCreateSerializer, HealthRecordSerializer


class HealthRecordViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/health-records/ (STEP7). ADMIN writes, CUSTOMER reads only health
    records for Chicks born from their own Booking."""

    permission_classes = (HealthWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('chick', 'chick__booking')
    search_fields = ('chick__wing_clip_number',)
    ordering_fields = ('record_date', 'created_at')
    ordering = ('-record_date', '-id')

    def get_queryset(self):
        queryset = HealthRecord.objects.select_related(
            'chick', 'chick__hatching__egg__booking__customer', 'recorded_by',
        ).all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(chick__hatching__egg__booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return HealthRecordCreateSerializer
        return HealthRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.record_health(
            chick_id=serializer.validated_data['chick'].id,
            record_date=serializer.validated_data['record_date'],
            weight=serializer.validated_data.get('weight'),
            symptom=serializer.validated_data.get('symptom', ''),
            observation=serializer.validated_data.get('observation', ''),
            medicine=serializer.validated_data.get('medicine', ''),
            remark=serializer.validated_data.get('remark', ''),
            recorded_by=request.user,
        )
        return Response(HealthRecordSerializer(record).data, status=status.HTTP_201_CREATED)
