from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.breeding import services
from apps.breeding.models import BreedingEvent, Egg, InseminationRecord
from apps.breeding.permissions import BreedingWritePermission
from apps.breeding.serializers import (
    BreedingEventCreateSerializer, BreedingEventSerializer, EggCreateSerializer, EggSerializer,
    InseminationRecordCreateSerializer, InseminationRecordSerializer,
)


class BreedingEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/breeding-events/ (STEP6). ADMIN writes, CUSTOMER reads only their own
    booking's events. Deliberately no update/delete endpoint — a customer must
    never edit the timeline, and corrections are new events, not edits.
    """

    permission_classes = (BreedingWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('booking', 'status')
    search_fields = ('booking__booking_number',)
    ordering_fields = ('event_date', 'created_at')
    ordering = ('event_date', 'id')

    def get_queryset(self):
        queryset = BreedingEvent.objects.select_related('booking', 'booking__customer', 'recorded_by').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return BreedingEventCreateSerializer
        return BreedingEventSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = services.record_breeding_event(
            booking_id=serializer.validated_data['booking'].id,
            status=serializer.validated_data['status'],
            event_date=serializer.validated_data['event_date'],
            description=serializer.validated_data.get('description', ''),
            recorded_by=request.user,
        )
        return Response(BreedingEventSerializer(event).data, status=status.HTTP_201_CREATED)


class InseminationRecordViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    """/api/v1/insemination-records/ — ADMIN writes, CUSTOMER reads their own booking's records only."""

    permission_classes = (BreedingWritePermission,)
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filterset_fields = ('booking',)
    ordering_fields = ('record_date', 'session_number', 'created_at')
    ordering = ('record_date', 'session_number')

    def get_queryset(self):
        queryset = InseminationRecord.objects.select_related('booking', 'booking__customer', 'recorded_by').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return InseminationRecordCreateSerializer
        return InseminationRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.create_insemination_record(
            booking_id=serializer.validated_data['booking'].id,
            record_date=serializer.validated_data['record_date'],
            note=serializer.validated_data.get('note', ''),
            recorded_by=request.user,
        )
        return Response(InseminationRecordSerializer(record).data, status=status.HTTP_201_CREATED)


class EggViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/eggs/ (STEP6). ADMIN writes, CUSTOMER reads only their own booking's egg records."""

    permission_classes = (BreedingWritePermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('booking',)
    search_fields = ('booking__booking_number',)
    ordering_fields = ('egg_date', 'created_at')
    ordering = ('-egg_date', '-id')

    def get_queryset(self):
        queryset = Egg.objects.select_related('booking', 'booking__customer', 'recorded_by').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return EggCreateSerializer
        return EggSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        egg = services.record_egg(
            booking_id=serializer.validated_data['booking'].id,
            total_eggs=serializer.validated_data['total_eggs'],
            good_eggs=serializer.validated_data.get('good_eggs', 0),
            bad_eggs=serializer.validated_data.get('bad_eggs', 0),
            egg_date=serializer.validated_data['egg_date'],
            incubation_date=serializer.validated_data.get('incubation_date'),
            remark=serializer.validated_data.get('remark', ''),
            recorded_by=request.user,
        )
        return Response(EggSerializer(egg).data, status=status.HTTP_201_CREATED)
