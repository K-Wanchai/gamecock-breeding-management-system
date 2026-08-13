from django.conf import settings
from django.db import models

from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


class Vaccination(TimeStampedModel):
    """STEP1 §4.12 — ประวัติวัคซีนลูกไก่."""

    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='vaccinations')
    vaccine_name = models.CharField(max_length=150)
    vaccine_date = models.DateField()
    next_due_date = models.DateField(blank=True, null=True)
    dose = models.CharField(max_length=50, blank=True, null=True)
    administered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='vaccinations_administered')
    note = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['vaccine_date']

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.chick.get_owner_user_id()

    def __str__(self):
        return f'{self.chick.wing_clip_number} - {self.vaccine_name} ({self.vaccine_date})'
