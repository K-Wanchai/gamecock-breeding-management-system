from django.conf import settings
from django.db import models

from apps.breeding.models import Egg
from apps.core.models import TimeStampedModel


class Hatching(TimeStampedModel):
    """STEP1 §4.9 — ข้อมูลการฟัก. State machine: STEP1 §9.4.

    hatched_count <= Egg.egg_count is a cross-row rule and is enforced in the
    service layer (STEP1 §7), not by a DB CHECK constraint.
    """

    class Status(models.TextChoices):
        INCUBATING = 'INCUBATING', 'กำลังฟัก'
        HATCHED = 'HATCHED', 'ฟักออกแล้ว'
        FAILED = 'FAILED', 'ฟักไม่สำเร็จ'

    egg = models.ForeignKey(Egg, on_delete=models.CASCADE, related_name='hatchings')
    hatch_start_date = models.DateField(blank=True, null=True)
    hatch_end_date = models.DateField(blank=True, null=True)
    hatched_count = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.INCUBATING, db_index=True)
    note = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='hatchings_recorded')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(hatched_count__gte=0), name='ck_hatching_count_gte_0'),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.egg.booking.customer_id

    def __str__(self):
        return f'Hatching#{self.id} egg#{self.egg_id} ({self.status})'
