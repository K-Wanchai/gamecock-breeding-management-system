import uuid

from django.conf import settings
from django.db import models

from apps.breeders.models import Breeder
from apps.core.models import TimeStampedModel
from apps.hens.models import Hen


class Booking(TimeStampedModel):
    """
    STEP1 §4.5 — การจองคิวฝากผสม, ปรับ field names/status ตาม STEP5 spec.
    State machine (STEP5):
        PENDING -> WAITING_PAYMENT -> PAID -> APPROVED -> IN_PROGRESS -> COMPLETED
        (CANCELLED / REJECTED reachable from any non-terminal state)
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'รอดำเนินการ'
        WAITING_PAYMENT = 'WAITING_PAYMENT', 'รอชำระเงิน'
        PAID = 'PAID', 'ชำระเงินแล้ว'
        APPROVED = 'APPROVED', 'อนุมัติแล้ว/ล็อกคิว'
        IN_PROGRESS = 'IN_PROGRESS', 'กำลังดำเนินการผสม'
        COMPLETED = 'COMPLETED', 'เสร็จสิ้น'
        CANCELLED = 'CANCELLED', 'ยกเลิก'
        REJECTED = 'REJECTED', 'ปฏิเสธ'

    # Statuses that count as "an active claim" on a hen / a queue slot (Critical Rules #1/#4)
    ACTIVE_STATUSES = (
        Status.PENDING, Status.WAITING_PAYMENT, Status.PAID, Status.APPROVED, Status.IN_PROGRESS,
    )

    class BreedingStage(models.TextChoices):
        RECEIVED_AT_FARM = 'RECEIVED_AT_FARM', 'รับเข้าฟาร์ม'
        PAIRED = 'PAIRED', 'เข้าคู่ผสม'
        EGG_LAYING = 'EGG_LAYING', 'ออกไข่'
        MOVED_TO_INCUBATOR = 'MOVED_TO_INCUBATOR', 'ย้ายเข้าตู้ฟัก'
        COMPLETED = 'COMPLETED', 'เสร็จสิ้น'

    public_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    booking_number = models.CharField(max_length=20, unique=True, editable=False)

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='bookings',
    )
    hen = models.ForeignKey(Hen, on_delete=models.PROTECT, related_name='bookings')
    breeder = models.ForeignKey(Breeder, on_delete=models.PROTECT, related_name='bookings')

    booking_date = models.DateField()
    # Derived from booking_date (never client-writable) — kept as real columns because the
    # queue-capacity constraints/lookups below are scoped per (breeder, year, month).
    booking_year = models.SmallIntegerField()
    booking_month = models.SmallIntegerField()
    queue_no = models.SmallIntegerField(blank=True, null=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    current_breeding_stage = models.CharField(
        max_length=20, choices=BreedingStage.choices, blank=True, null=True,
    )
    note = models.TextField(blank=True, null=True)

    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bookings_approved',
    )
    locked_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bookings_cancelled',
    )
    cancel_reason = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['hen'],
                # Kept as a literal list (not a reference to ACTIVE_STATUSES) because a nested
                # Meta class body cannot see names from the enclosing Booking class body.
                condition=models.Q(status__in=['PENDING', 'WAITING_PAYMENT', 'PAID', 'APPROVED', 'IN_PROGRESS']),
                name='uq_booking_hen_active',
            ),
            models.UniqueConstraint(
                fields=['hen', 'breeder', 'booking_year', 'booking_month'],
                condition=~models.Q(status__in=['CANCELLED', 'REJECTED']),
                name='uq_booking_no_duplicate_request',
            ),
            models.UniqueConstraint(
                fields=['breeder', 'booking_year', 'booking_month', 'queue_no'],
                condition=models.Q(queue_no__isnull=False),
                name='uq_booking_queue_slot',
            ),
            models.CheckConstraint(
                condition=models.Q(booking_month__gte=1, booking_month__lte=12), name='ck_booking_month_1_12',
            ),
            models.CheckConstraint(
                condition=models.Q(deposit_amount__gte=0) & models.Q(deposit_amount__lte=models.F('price')),
                name='ck_booking_deposit_between_0_and_price',
            ),
            models.CheckConstraint(condition=models.Q(paid_amount__gte=0), name='ck_booking_paid_amount_gte_0'),
            models.CheckConstraint(
                condition=models.Q(remaining_amount__gte=0), name='ck_booking_remaining_amount_gte_0'
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=[
                    'PENDING', 'WAITING_PAYMENT', 'PAID', 'APPROVED', 'IN_PROGRESS',
                    'COMPLETED', 'CANCELLED', 'REJECTED',
                ]),
                name='ck_booking_status_valid',
            ),
        ]
        indexes = [
            models.Index(fields=['breeder', 'booking_year', 'booking_month']),
            # STEP9 — Booking Report / Search date-range filtering (date_from/date_to on booking_date).
            models.Index(fields=['booking_date']),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.customer_id

    def __str__(self):
        return f'{self.booking_number} {self.hen.name} x {self.breeder.name} ({self.booking_year}-{self.booking_month:02d})'
