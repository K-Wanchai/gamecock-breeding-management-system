from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.chicks import services
from apps.chicks.models import Chick
from apps.chicks.permissions import ChickWritePermission
from apps.chicks.serializers import ChickCreateSerializer, ChickSerializer


class ChickViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/chicks/ (STEP7). ADMIN writes, CUSTOMER reads only Chicks born from
    their own Booking. No update/delete endpoint at this step."""

    permission_classes = (ChickWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('hatching', 'booking', 'status', 'gender')
    search_fields = ('wing_clip_number', 'name')
    ordering_fields = ('birth_date', 'created_at')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Chick.objects.select_related(
            'hatching', 'hatching__egg', 'hatching__egg__booking', 'hatching__egg__booking__customer', 'booking',
        ).all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(hatching__egg__booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ChickCreateSerializer
        return ChickSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chick = services.create_chick(
            hatching_id=serializer.validated_data['hatching'].id,
            birth_date=serializer.validated_data['birth_date'],
            name=serializer.validated_data.get('name', ''),
            gender=serializer.validated_data.get('gender', Chick.Gender.UNKNOWN),
            color_note=serializer.validated_data.get('color_note'),
        )
        return Response(ChickSerializer(chick).data, status=status.HTTP_201_CREATED)
