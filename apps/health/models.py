from django.conf import settings
from django.db import models

from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


class HealthRecord(TimeStampedModel):
    """STEP1 §4.11 / STEP7 — ประวัติสุขภาพลูกไก่.

    record_date must fall within the chick's life (not before Chick.birth_date, not
    in the future) — a cross-row rule enforced in the service layer, not by a DB
    CHECK constraint (Postgres CHECK cannot reference another table's row).
    """

    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='health_records')
    record_date = models.DateField()
    weight = models.DecimalField(max_digits=6, decimal_places=1, blank=True, null=True)
    symptom = models.TextField(blank=True, null=True)
    observation = models.TextField(blank=True, null=True)
    medicine = models.TextField(blank=True, null=True)
    remark = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='health_records_recorded')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(weight__gte=0), name='ck_health_weight_gte_0'),
        ]
        ordering = ['record_date']

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.chick.get_owner_user_id()

    def __str__(self):
        return f'{self.chick.wing_clip_number} @ {self.record_date}'
