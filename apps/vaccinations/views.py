from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.vaccinations import services
from apps.vaccinations.models import Vaccination
from apps.vaccinations.permissions import VaccinationWritePermission
from apps.vaccinations.serializers import VaccinationCreateSerializer, VaccinationSerializer


class VaccinationViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/vaccinations/ (STEP7). ADMIN writes, CUSTOMER reads only vaccination
    records for Chicks born from their own Booking."""

    permission_classes = (VaccinationWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('chick', 'vaccine_name')
    search_fields = ('chick__wing_clip_number', 'vaccine_name')
    ordering_fields = ('vaccination_date', 'created_at')
    ordering = ('-vaccination_date', '-id')

    def get_queryset(self):
        queryset = Vaccination.objects.select_related(
            'chick', 'chick__hatching__egg__booking__customer', 'recorded_by',
        ).all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(chick__hatching__egg__booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return VaccinationCreateSerializer
        return VaccinationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vaccination = services.record_vaccination(
            chick_id=serializer.validated_data['chick'].id,
            vaccine_name=serializer.validated_data['vaccine_name'],
            vaccination_date=serializer.validated_data['vaccination_date'],
            dose_number=serializer.validated_data['dose_number'],
            remark=serializer.validated_data.get('remark', ''),
            recorded_by=request.user,
        )
        return Response(VaccinationSerializer(vaccination).data, status=status.HTTP_201_CREATED)
