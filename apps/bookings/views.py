import io

from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.bookings import services
from apps.bookings.models import Booking
from apps.bookings.permissions import BookingActionPermission
from apps.bookings.serializers import (
    BookingCancelSerializer, BookingCreateSerializer, BookingSerializer, BookingTimelineSerializer,
)


class BookingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/bookings/ (STEP5). Only create/list/retrieve/approve/cancel are exposed —
    there is deliberately no generic update endpoint, so breeder/hen/price can never be
    edited after creation (Critical Rules #14/#15).
    """

    permission_classes = (BookingActionPermission,)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('status', 'breeder', 'booking_year', 'booking_month', 'booking_date', 'hen_brooding', 'clip_ready')
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

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        GET /api/v1/bookings/{id}/timeline/

        Returns the booking header, all breeding-stage events in chronological
        order, and all egg-laying records in chronological order so the customer
        can track their hen's progress in a single request.
        Ownership is enforced by get_object() (404 for any booking that doesn't
        belong to the requesting customer).
        """
        from django.db.models import Prefetch

        from apps.breeding.models import BreedingEvent, Egg, InseminationRecord

        booking = self.get_object()
        booking = (
            Booking.objects
            .select_related('customer', 'hen', 'breeder')
            .prefetch_related(
                Prefetch('inseminations', queryset=InseminationRecord.objects.order_by('record_date', 'session_number')),
                Prefetch('breeding_events', queryset=BreedingEvent.objects.order_by('event_date', 'id')),
                Prefetch('eggs', queryset=Egg.objects.order_by('egg_date', 'id')),
            )
            .get(pk=booking.pk)
        )
        return Response(BookingTimelineSerializer(booking).data)

    @action(detail=True, methods=['patch'])
    def mark_brooding(self, request, pk=None):
        """PATCH /api/v1/bookings/{id}/mark_brooding/ — ADMIN only. Sets hen_brooding=True."""
        booking = self.get_object()
        booking = services.mark_hen_brooding(booking_id=booking.id, admin=request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'])
    def mark_clip_ready(self, request, pk=None):
        """PATCH /api/v1/bookings/{id}/mark_clip_ready/ — ADMIN only. Signals that health recording is done."""
        booking = self.get_object()
        booking = services.mark_clip_ready(booking_id=booking.id, admin=request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        """PATCH /api/v1/bookings/{id}/complete/ — ADMIN only. Transitions IN_PROGRESS → COMPLETED."""
        booking = self.get_object()
        booking = services.complete_booking(booking_id=booking.id, admin=request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['get'])
    def batch_certificate(self, request, pk=None):
        """GET /api/v1/bookings/{id}/batch_certificate/ — ADMIN only. Streams combined pedigree PDF."""
        booking = self.get_object()
        from apps.documents.pdf import render_batch_certificate
        pdf_bytes = render_batch_certificate(booking)
        resp = FileResponse(io.BytesIO(pdf_bytes), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="cert-{booking.booking_number}.pdf"'
        return resp

    @action(detail=True, methods=['get'])
    def delivery_label(self, request, pk=None):
        """GET /api/v1/bookings/{id}/delivery_label/ — ADMIN only. Streams delivery address label PDF."""
        booking = self.get_object()
        from apps.documents.pdf import render_delivery_label
        pdf_bytes = render_delivery_label(booking)
        resp = FileResponse(io.BytesIO(pdf_bytes), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="label-{booking.booking_number}.pdf"'
        return resp
