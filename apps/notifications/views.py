import json
import logging

<<<<<<< HEAD
from django.http import HttpResponse, HttpResponseForbidden
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

=======
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.exceptions import AppError
>>>>>>> origin/main
from apps.notifications import services
from apps.notifications.models import Notification
from apps.notifications.permissions import NotificationPermission
from apps.notifications.serializers import LineLinkCodeSerializer, NotificationSerializer

logger = logging.getLogger('apps.notifications')


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
<<<<<<< HEAD
    """/api/v1/notifications/ (STEP17) — read-only inbox, list/retrieve only."""
=======
    """
    /api/v1/notifications/ (STEP9). Read-only log of LINE notifications — rows are
    only ever created by the service layer (booking/payment status changes), never
    via this API. `retry` (ADMIN-only, see NotificationPermission) re-attempts
    delivery of a FAILED notification.
    """
>>>>>>> origin/main

    serializer_class = NotificationSerializer
    permission_classes = (NotificationPermission,)
    filter_backends = (DjangoFilterBackend, OrderingFilter)
<<<<<<< HEAD
    filterset_fields = ('status', 'notif_type')
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Notification.objects.select_related('booking', 'chick').all()
=======
    filterset_fields = ('status', 'notif_type', 'channel')
    ordering_fields = ('created_at', 'sent_at')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Notification.objects.select_related('user', 'booking', 'chick').all()
>>>>>>> origin/main
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(user=user)

<<<<<<< HEAD

class LineLinkCodeView(APIView):
    """POST /api/v1/notifications/line/link-code/ — the logged-in customer requests a fresh 6-digit LINE link code."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        link_code = services.generate_link_code(request.user)
        return Response(LineLinkCodeSerializer(link_code).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LineWebhookView(View):
    """
    POST /api/v1/notifications/line/webhook/ — receives message events from the LINE
    Messaging API. Deliberately a plain Django view (not DRF): signature verification
    needs the exact raw request body LINE signed, and going through DRF's request
    wrapping/parsing risks that byte-for-byte body no longer being available. No
    session/JWT auth applies here — the HMAC signature check *is* the auth.
    """

    def post(self, request):
        signature = request.headers.get('X-Line-Signature', '')
        if not services.verify_line_signature(request.body, signature):
            return HttpResponseForbidden()

        try:
            payload = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return HttpResponse(status=400)
=======
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        notification = self.get_object()
        notification = services.retry_notification(notification_id=notification.id, admin=request.user)
        return Response(NotificationSerializer(notification).data)


class LineLinkCodeView(APIView):
    """POST /api/v1/notifications/line/link-code/ (STEP9) — issues a short-lived
    6-digit code the authenticated user sends as a LINE message to link their
    LINE account (apps.notifications.services.generate_line_link_code)."""

    permission_classes = (IsAuthenticated,)
    serializer_class = LineLinkCodeSerializer

    def post(self, request, *args, **kwargs):
        code, expires_at = services.generate_line_link_code(request.user)
        return Response(LineLinkCodeSerializer({'code': code, 'expires_at': expires_at}).data)


class LineWebhookView(APIView):
    """
    POST /api/v1/notifications/line/webhook/ (STEP9) — receives LINE Messaging API
    webhook events. Called directly by LINE's servers, not by our own frontend, so
    it deliberately carries no JWT authentication; the X-Line-Signature HMAC check
    (apps.notifications.services.verify_line_signature) is the security boundary
    instead, and is verified before the payload is touched in any way.
    """

    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = 'line_webhook'

    def post(self, request, *args, **kwargs):
        signature = request.headers.get('X-Line-Signature', '')
        if not services.verify_line_signature(request.body, signature):
            raise AppError('INVALID_SIGNATURE', 'Invalid X-Line-Signature header.', http_status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(request.body.decode('utf-8')) if request.body else {}
        except (ValueError, UnicodeDecodeError):
            payload = {}
>>>>>>> origin/main

        for event in payload.get('events', []):
            try:
                services.process_line_webhook_event(event)
            except Exception:
<<<<<<< HEAD
                # One malformed/unexpected event must never fail the whole batch or make
                # LINE think the webhook itself is broken (it retries on non-2xx).
                logger.exception('Failed to process LINE webhook event: %r', event)

        return HttpResponse(status=200)
=======
                # One malformed/unexpected event must never break the ack for the rest
                # of the batch, or LINE will keep redelivering the whole payload.
                logger.exception('Unexpected error while processing LINE webhook event: %r', event)

        # LINE expects a fast 200 regardless of what each event resolved to.
        return Response(status=status.HTTP_200_OK)
>>>>>>> origin/main
