from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """STEP1 §4.14 — log การแจ้งเตือน (LINE integration ต่อจริงใน STEP3)."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'รอส่ง'
        SENT = 'SENT', 'ส่งแล้ว'
        FAILED = 'FAILED', 'ส่งไม่สำเร็จ'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    channel = models.CharField(max_length=10, default='EMAIL')
    notif_type = models.CharField(max_length=30, db_index=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='notifications', blank=True, null=True)
    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='notifications', blank=True, null=True)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    error_note = models.CharField(max_length=255, blank=True, null=True)
    # STEP9 — number of retry attempts made via apps.notifications.services.retry_notification();
    # capped at MAX_RETRY_ATTEMPTS there (defense-in-depth backstop is the CheckConstraint below).
    retry_count = models.SmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(retry_count__gte=0), name='ck_notification_retry_count_gte_0'),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.user_id

    def __str__(self):
        return f'{self.notif_type} -> {self.user.username} ({self.status})'
