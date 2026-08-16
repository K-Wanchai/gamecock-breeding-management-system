from django.db import models

from apps.bookings.models import Booking
from apps.core.models import TimeStampedModel
from apps.hatching.models import Hatching


class Chick(TimeStampedModel):
    """STEP1 §4.10 / STEP7 — ลูกไก่รายตัว. State machine: STEP1 §9.5.

    wing_clip_number must only be generated via apps.chicks.services.create_chick(),
    which uses apps.core.services.next_running_number() under a row lock
    (STEP1 Business Rule #14 — race condition prevention). STEP7 formalizes the
    remaining create_chick() rules: the parent Hatching must exist and be HATCHED,
    and the number of Chick rows for one Hatching must never exceed its hatched_count.

    `booking` is a denormalized convenience FK (always set server-side from
    hatching.egg.booking, never accepted from the client) for cheap filtering/
    reporting — it is deliberately NOT used for ownership decisions. get_owner_user_id()
    still walks the full User -> Booking -> Hatching -> Chick relationship chain via
    `hatching` so ownership never depends on trusting a denormalized shortcut field.
    """

    class Gender(models.TextChoices):
        MALE = 'MALE', 'ตัวผู้'
        FEMALE = 'FEMALE', 'ตัวเมีย'
        UNKNOWN = 'UNKNOWN', 'ยังไม่ทราบ'

    class Status(models.TextChoices):
        ALIVE = 'ALIVE', 'มีชีวิต'
        DECEASED = 'DECEASED', 'ตาย'
        DELIVERED = 'DELIVERED', 'ส่งมอบแล้ว'

    hatching = models.ForeignKey(Hatching, on_delete=models.PROTECT, related_name='chicks')
    booking = models.ForeignKey(
        Booking, on_delete=models.PROTECT, related_name='chicks', blank=True, null=True,
    )
    name = models.CharField(max_length=100, blank=True, null=True)
    wing_clip_number = models.CharField(max_length=20, unique=True)
    birth_date = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.UNKNOWN)
    color_note = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ALIVE, db_index=True)

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.hatching.egg.booking.customer_id

    def __str__(self):
        return self.wing_clip_number
