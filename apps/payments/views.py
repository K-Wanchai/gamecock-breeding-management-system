from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.payments import services
from apps.payments.models import Payment
from apps.payments.permissions import PaymentActionPermission
from apps.payments.serializers import PaymentCreateSerializer, PaymentResubmitSerializer, PaymentReviewSerializer, PaymentSerializer


class PaymentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/payments/ (STEP5). Only create/list/retrieve/approve/reject are exposed."""

    permission_classes = (PaymentActionPermission,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_fields = ('status', 'payment_type', 'booking')
    search_fields = ('payment_number', 'booking__booking_number')
    ordering_fields = ('paid_at', 'created_at', 'status')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Payment.objects.select_related('booking', 'booking__customer', 'verified_by').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(booking__customer=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        if self.action in ('approve', 'reject'):
            return PaymentReviewSerializer
        return PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.create_payment(
            customer=request.user,
            booking=serializer.validated_data['booking'],
            payment_type=serializer.validated_data['payment_type'],
            amount=serializer.validated_data['amount'],
            slip=serializer.validated_data['slip'],
            paid_at=serializer.validated_data['paid_at'],
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        payment = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.approve_payment(
            payment_id=payment.id, admin=request.user, remark=serializer.validated_data.get('remark', ''),
        )
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        payment = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.reject_payment(
            payment_id=payment.id, admin=request.user, remark=serializer.validated_data.get('remark', ''),
        )
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['patch'])
    def resubmit(self, request, pk=None):
        """CUSTOMER — replace slip on a REJECTED payment; payment_number is preserved."""
        payment = self.get_object()
        serializer = PaymentResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.resubmit_payment(
            payment_id=payment.id,
            customer=request.user,
            slip=serializer.validated_data['slip'],
            paid_at=serializer.validated_data['paid_at'],
        )
        return Response(PaymentSerializer(payment).data)
