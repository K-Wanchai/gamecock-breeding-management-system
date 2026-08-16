from django.conf import settings
from django.db import models

from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


class Vaccination(TimeStampedModel):
    """STEP1 §4.12 / STEP7 — ประวัติวัคซีนลูกไก่.

    age_days is a server-computed snapshot (vaccination_date - chick.birth_date, in
    days) set by apps.vaccinations.services.record_vaccination() — never accepted
    from the client, same "computed snapshot" convention as Booking.price/deposit_amount.
    """

    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='vaccinations')
    vaccine_name = models.CharField(max_length=150)
    vaccination_date = models.DateField()
    age_days = models.SmallIntegerField(blank=True, null=True)
    dose_number = models.SmallIntegerField()
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='vaccinations_recorded')
    remark = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(dose_number__gte=1), name='ck_vaccination_dose_number_gte_1'),
            models.CheckConstraint(condition=models.Q(age_days__gte=0), name='ck_vaccination_age_days_gte_0'),
            models.UniqueConstraint(
                fields=['chick', 'vaccine_name', 'dose_number'], name='uq_vaccination_chick_vaccine_dose',
            ),
        ]
        ordering = ['vaccination_date']

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.chick.get_owner_user_id()

    def __str__(self):
        return f'{self.chick.wing_clip_number} - {self.vaccine_name} dose {self.dose_number} ({self.vaccination_date})'
