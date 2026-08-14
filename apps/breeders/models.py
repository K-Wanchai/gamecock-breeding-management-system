from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_image_file


class Breeder(TimeStampedModel):
    """STEP1 §4.2 — พ่อพันธุ์ไก่ (extended in STEP4 §PART A: breed, description, image, service_start_date)."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'ให้บริการอยู่'
        INACTIVE = 'INACTIVE', 'ปิดรับชั่วคราว'
        RETIRED = 'RETIRED', 'ปลดระวาง'

    name = models.CharField(max_length=150, db_index=True)
    breed = models.CharField(max_length=150, blank=True, null=True, db_index=True)
    bloodline = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(
        upload_to='breeders/%Y/%m/', max_length=255, blank=True, null=True,
        validators=[validate_image_file],
    )
    service_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    default_monthly_quota = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    # วันที่เริ่มให้บริการ — needed by the STEP5 queue: a breeder cannot be booked into a
    # month before this date, so it must be captured now even though booking logic itself
    # is out of scope for this step.
    service_start_date = models.DateField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='breeders_created',
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(service_rate__gte=0), name='ck_breeder_service_rate_gte_0'),
            models.CheckConstraint(
                condition=models.Q(default_monthly_quota__gte=0), name='ck_breeder_default_quota_gte_0'
            ),
        ]

    def __str__(self):
        return self.name


class BreederMonthlyQuota(TimeStampedModel):
    """STEP1 §4.3 — โควตา/คิวว่างของพ่อพันธุ์ในแต่ละเดือน (เพิ่มเองเพื่อปิด gap ของ DFD, ดู STEP1 §15 #3)."""

    breeder = models.ForeignKey(Breeder, on_delete=models.CASCADE, related_name='monthly_quotas')
    year = models.SmallIntegerField()
    month = models.SmallIntegerField()
    max_slots = models.SmallIntegerField(default=0)
    is_open = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['breeder', 'year', 'month'], name='uq_quota_breeder_year_month'),
            models.CheckConstraint(condition=models.Q(year__gte=2000), name='ck_quota_year_gte_2000'),
            models.CheckConstraint(condition=models.Q(month__gte=1, month__lte=12), name='ck_quota_month_1_12'),
            models.CheckConstraint(condition=models.Q(max_slots__gte=0), name='ck_quota_max_slots_gte_0'),
        ]

    def __str__(self):
        return f'{self.breeder.name} {self.year}-{self.month:02d} ({self.max_slots} slots)'
