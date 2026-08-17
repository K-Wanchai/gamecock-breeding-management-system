from django.conf import settings
from django.db import models

from apps.breeding.models import Egg
from apps.core.models import TimeStampedModel


class Hatching(TimeStampedModel):
    """STEP1 §4.9 / STEP7 — ข้อมูลการฟักไข่ต่อ batch ไข่ (Egg). State machine: STEP1 §9.4.

    Two-phase lifecycle: apps.hatching.services.start_hatching() creates the row
    (status=INCUBATING, total_eggs snapshotted from the Egg batch, completed_at
    still null); apps.hatching.services.complete_hatching() later fills in
    completed_at/hatched_count/failed_count/survival_count and flips status to
    HATCHED or FAILED. apps.chicks.services.create_chick() only allows creating
    Chick rows once status == HATCHED, and caps the count at hatched_count — both
    are cross-row rules enforced in the service layer, not by a DB CHECK constraint.
    """

    class Status(models.TextChoices):
        INCUBATING = 'INCUBATING', 'กำลังฟัก'
        HATCHED = 'HATCHED', 'ฟักออกแล้ว'
        FAILED = 'FAILED', 'ฟักไม่สำเร็จ'

    egg = models.ForeignKey(Egg, on_delete=models.CASCADE, related_name='hatchings')
    started_at = models.DateField()
    completed_at = models.DateField(blank=True, null=True)
    # Snapshot of egg.total_eggs at the moment hatching starts (never client-supplied) —
    # the authoritative cap that hatched_count + failed_count must stay within.
    total_eggs = models.SmallIntegerField()
    hatched_count = models.SmallIntegerField(default=0)
    failed_count = models.SmallIntegerField(default=0)
    survival_count = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.INCUBATING, db_index=True)
    remark = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='hatchings_recorded')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(total_eggs__gte=0), name='ck_hatching_total_eggs_gte_0'),
            models.CheckConstraint(condition=models.Q(hatched_count__gte=0), name='ck_hatching_hatched_count_gte_0'),
            models.CheckConstraint(condition=models.Q(failed_count__gte=0), name='ck_hatching_failed_count_gte_0'),
            models.CheckConstraint(condition=models.Q(survival_count__gte=0), name='ck_hatching_survival_count_gte_0'),
            models.CheckConstraint(
                condition=models.Q(total_eggs__gte=models.F('hatched_count') + models.F('failed_count')),
                name='ck_hatching_hatched_plus_failed_lte_total',
            ),
            models.CheckConstraint(
                condition=models.Q(hatched_count__gte=models.F('survival_count')),
                name='ck_hatching_survival_lte_hatched',
            ),
            models.CheckConstraint(
                condition=models.Q(completed_at__isnull=True) | models.Q(completed_at__gte=models.F('started_at')),
                name='ck_hatching_completed_not_before_started',
            ),
        ]
        ordering = ['-started_at', '-id']
        # STEP9 — Hatching Report date-range filtering (date_from/date_to on started_at).
        indexes = [
            models.Index(fields=['started_at']),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.egg.booking.customer_id

    def __str__(self):
        return f'Hatching#{self.id} egg#{self.egg_id} ({self.status})'
