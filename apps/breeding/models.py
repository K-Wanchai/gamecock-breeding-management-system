from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.core.models import TimeStampedModel


class BreedingTimeline(TimeStampedModel):
    """STEP1 §4.7 — ไทม์ไลน์สถานะแม่ไก่/การผสม (event log). State machine: STEP1 §9.3."""

    class Stage(models.TextChoices):
        RECEIVED_AT_FARM = 'RECEIVED_AT_FARM', 'รับเข้าฟาร์ม'
        PAIRED = 'PAIRED', 'เข้าคู่ผสม'
        EGG_LAYING = 'EGG_LAYING', 'ออกไข่'
        MOVED_TO_INCUBATOR = 'MOVED_TO_INCUBATOR', 'ย้ายเข้าตู้ฟัก'
        COMPLETED = 'COMPLETED', 'เสร็จสิ้น'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='timeline_events')
    stage = models.CharField(max_length=20, choices=Stage.choices)
    event_date = models.DateField()
    note = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='timeline_events_recorded')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['booking', 'stage'], name='uq_timeline_booking_stage'),
        ]
        ordering = ['event_date']

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'Booking#{self.booking_id} -> {self.stage} ({self.event_date})'


class Egg(TimeStampedModel):
    """STEP1 §4.8 — ข้อมูลการออกไข่."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='eggs')
    lay_date = models.DateField()
    egg_count = models.SmallIntegerField()
    note = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='eggs_recorded')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(egg_count__gte=0), name='ck_egg_count_gte_0'),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'Egg batch#{self.id} booking#{self.booking_id} ({self.egg_count} eggs)'
