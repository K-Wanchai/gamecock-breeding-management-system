from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.core.models import TimeStampedModel
from apps.core.validators import validate_image_file


class Payment(TimeStampedModel):
    """STEP1 §4.6 — การชำระเงิน, ปรับ field names/status ตาม STEP5 spec."""

    class PaymentType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'มัดจำ'
        FULL = 'FULL', 'เต็มจำนวน'
        ADDITIONAL = 'ADDITIONAL', 'ชำระเพิ่มเติม'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'รอตรวจสอบ'
        APPROVED = 'APPROVED', 'อนุมัติแล้ว'
        REJECTED = 'REJECTED', 'ปฏิเสธ'
        CANCELLED = 'CANCELLED', 'ยกเลิก'

    payment_number = models.CharField(max_length=20, unique=True, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=12, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    slip = models.ImageField(upload_to='payment_slips/%Y/%m/', max_length=255, validators=[validate_image_file])
    paid_at = models.DateTimeField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING, db_index=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments_verified',
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    remark = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'payment_type'],
                condition=models.Q(status='PENDING'),
                name='uq_payment_pending_type',
            ),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='ck_payment_amount_gt_0'),
            models.CheckConstraint(
                condition=models.Q(status__in=['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
                name='ck_payment_status_valid',
            ),
        ]
        # STEP9 — Payment/Revenue Report date-range filtering (date_from/date_to on paid_at).
        indexes = [
            models.Index(fields=['paid_at']),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'{self.payment_number} {self.payment_type} {self.amount} ({self.status})'
