from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.core.models import TimeStampedModel


class BreedingEvent(TimeStampedModel):
    """STEP6 — breeding process timeline (event log) for an approved Booking.

    Flow: RECEIVED -> BREEDING -> BREEDING_COMPLETED -> WAITING_EGG -> EGG_LAID
    -> INCUBATION -> HATCHING. Allowed transitions are enforced in
    apps.breeding.services.transition_breeding_status(), not here — this model
    only stores the log. Supersedes the STEP1 §4.7/§9.3 5-stage design.
    """

    class Status(models.TextChoices):
        RECEIVED = 'RECEIVED', 'รับแม่ไก่เข้าฟาร์ม'
        BREEDING = 'BREEDING', 'กำลังผสมพันธุ์'
        BREEDING_COMPLETED = 'BREEDING_COMPLETED', 'ผสมพันธุ์เสร็จสิ้น'
        WAITING_EGG = 'WAITING_EGG', 'รอออกไข่'
        EGG_LAID = 'EGG_LAID', 'ออกไข่แล้ว'
        INCUBATION = 'INCUBATION', 'เข้าตู้ฟัก'
        HATCHING = 'HATCHING', 'ฟักไข่'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='breeding_events')
    status = models.CharField(max_length=20, choices=Status.choices, db_index=True)
    event_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='breeding_events_recorded',
    )

    class Meta:
        constraints = [
            # Each stage occurs at most once per booking — also the DB-level backstop
            # against a duplicate/race submission of the same next event (Global Rule #29).
            models.UniqueConstraint(fields=['booking', 'status'], name='uq_breeding_event_booking_status'),
        ]
        ordering = ['event_date', 'id']
        # STEP9 — Breeding Report date-range filtering (date_from/date_to on event_date).
        indexes = [
            models.Index(fields=['event_date']),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'Booking#{self.booking_id} -> {self.status} ({self.event_date})'


class Egg(TimeStampedModel):
    """STEP1 §4.8 / STEP6 — ข้อมูลการออกไข่ต่อการจอง (egg batch tracking)."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='eggs')
    total_eggs = models.SmallIntegerField()
    good_eggs = models.SmallIntegerField(default=0)
    bad_eggs = models.SmallIntegerField(default=0)
    egg_date = models.DateField()
    incubation_date = models.DateField(blank=True, null=True)
    remark = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='eggs_recorded')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(total_eggs__gte=0), name='ck_egg_total_eggs_gte_0'),
            models.CheckConstraint(condition=models.Q(good_eggs__gte=0), name='ck_egg_good_eggs_gte_0'),
            models.CheckConstraint(condition=models.Q(bad_eggs__gte=0), name='ck_egg_bad_eggs_gte_0'),
            models.CheckConstraint(
                condition=models.Q(total_eggs__gte=models.F('good_eggs') + models.F('bad_eggs')),
                name='ck_egg_good_plus_bad_lte_total',
            ),
        ]
        ordering = ['-egg_date', '-id']
        # STEP9 — Egg Report date-range filtering (date_from/date_to on egg_date).
        indexes = [
            models.Index(fields=['egg_date']),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.booking.customer_id

    def __str__(self):
        return f'Egg batch#{self.id} booking#{self.booking_id} ({self.total_eggs} eggs)'


class InseminationRecord(TimeStampedModel):
    """บันทึกการฉีดน้ำเชื้อต่อการจอง — หลายครั้งได้ ไม่มี state machine.

    ครั้งที่ 1, ครั้งที่ 2, ... บันทึกทุกครั้งที่ฉีดน้ำเชื้อจนกว่าแม่ไก่จะเข้าฟักเอง
    (booking.hen_brooding = True). session_number คำนวณ server-side ห้าม client ส่งมา.
    """

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='inseminations')
    session_number = models.SmallIntegerField()
    record_date = models.DateField()
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='inseminations_recorded',
    )

    class Meta:
        ordering = ['record_date', 'session_number']
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'session_number'], name='uq_insemination_booking_session',
            ),
        ]

    def get_owner_user_id(self):
        return self.booking.customer_id

    def __str__(self):
        return f'Insemination#{self.session_number} booking#{self.booking_id} ({self.record_date})'
