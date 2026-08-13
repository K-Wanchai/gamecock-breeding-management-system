from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.core.models import TimeStampedModel


class Payment(TimeStampedModel):
    """STEP1 §4.6 — การชำระเงิน. State machine: STEP1 §9.2."""

    class PaymentType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'มัดจำ'
        FULL = 'FULL', 'เต็มจำนวน'
        ADDITIONAL = 'ADDITIONAL', 'ชำระเพิ่มเติม'

    class Status(models.TextChoices):
        PENDING_REVIEW = 'PENDING_REVIEW', 'รอตรวจสอบ'
        APPROVED = 'APPROVED', 'อนุมัติแล้ว'
        REJECTED = 'REJECTED', 'ปฏิเสธ'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=12, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    slip_image_path = models.CharField(max_length=255)
    paid_at = models.DateTimeField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING_REVIEW, db_index=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments_reviewed',
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reject_reason = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'payment_type'],
                condition=models.Q(status='PENDING_REVIEW'),
                name='uq_payment_pending_type',
            ),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='ck_payment_amount_gt_0'),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'Payment#{self.id} {self.payment_type} {self.amount} ({self.status})'
