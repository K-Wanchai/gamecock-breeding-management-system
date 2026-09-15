from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.bookings import services
from apps.bookings.models import Booking
from apps.bookings.permissions import BookingActionPermission
from apps.bookings.serializers import BookingCancelSerializer, BookingCreateSerializer, BookingSerializer


class BookingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/bookings/ (STEP5). Only create/list/retrieve/approve/cancel are exposed —
    there is deliberately no generic update endpoint, so breeder/hen/price can never be
    edited after creation (Critical Rules #14/#15).
    """

    permission_classes = (BookingActionPermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('status', 'breeder', 'booking_year', 'booking_month', 'booking_date')
    search_fields = ('booking_number', 'hen__name', 'breeder__name')
    ordering_fields = ('booking_date', 'created_at', 'status')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = (
            Booking.objects
            .select_related('customer', 'hen', 'breeder')
            .prefetch_related('breeding_events')
            .all()
        )
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        if self.action == 'cancel':
            return BookingCancelSerializer
        return BookingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = services.create_booking(
            customer=request.user,
            hen=serializer.validated_data['hen'],
            breeder=serializer.validated_data['breeder'],
            booking_date=serializer.validated_data['booking_date'],
            note=serializer.validated_data.get('note', ''),
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        booking = self.get_object()
        booking = services.approve_booking(booking_id=booking.id, admin=request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = services.cancel_booking(
            booking_id=booking.id, actor=request.user, reason=serializer.validated_data.get('reason', ''),
        )
        return Response(BookingSerializer(booking).data)
