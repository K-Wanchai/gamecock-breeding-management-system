import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from apps.notifications import services
from apps.notifications.models import Notification
from apps.notifications.permissions import NotificationPermission
from apps.notifications.serializers import NotificationSerializer

logger = logging.getLogger('apps.notifications')


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/v1/notifications/ (STEP9). Read-only log of LINE notifications — rows are
    only ever created by the service layer (booking/payment status changes), never
    via this API. `retry` (ADMIN-only, see NotificationPermission) re-attempts
    delivery of a FAILED notification.
    """

    serializer_class = NotificationSerializer
    permission_classes = (NotificationPermission,)
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filterset_fields = ('status', 'notif_type', 'channel')
    ordering_fields = ('created_at', 'sent_at')
    ordering = ('-created_at',)

    def get_queryset(self):
        queryset = Notification.objects.select_related('user', 'booking', 'chick').all()
        user = self.request.user
        if user.role == user.Role.ADMIN:
            return queryset
        return queryset.filter(user=user)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        notification = self.get_object()
        notification = services.retry_notification(notification_id=notification.id, admin=request.user)
        return Response(NotificationSerializer(notification).data)
