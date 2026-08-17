import json
import logging

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

from apps.notifications import services
from apps.notifications.models import Notification
from apps.notifications.permissions import NotificationPermission
from apps.notifications.serializers import LineLinkCodeSerializer, NotificationSerializer

logger = logging.getLogger('apps.notifications')


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/notifications/ (STEP17) — read-only inbox, list/retrieve only."""

    serializer_class = NotificationSerializer
    permission_classes = (NotificationPermission,)
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filterset_fields = ('status', 'notif_type')
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Notification.objects.select_related('booking', 'chick').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(user=user)


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

        for event in payload.get('events', []):
            try:
                services.process_line_webhook_event(event)
            except Exception:
                # One malformed/unexpected event must never fail the whole batch or make
                # LINE think the webhook itself is broken (it retries on non-2xx).
                logger.exception('Failed to process LINE webhook event: %r', event)

        return HttpResponse(status=200)
