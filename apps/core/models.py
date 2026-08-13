from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base giving every concrete model created_at/updated_at (Global Rule #10)."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class RunningNumberCounter(TimeStampedModel):
    """
    Central race-condition-safe sequence generator (STEP1 §4.15 / Business Rule #14).

    One row per (counter_type, year). apps.core.services.next_running_number()
    locks the row with SELECT ... FOR UPDATE before incrementing, so concurrent
    requests can never hand out the same number.
    """

    class CounterType(models.TextChoices):
        WING_CLIP = 'WING_CLIP', 'Wing Clip Number'
        BOOKING_QUEUE = 'BOOKING_QUEUE', 'Booking Queue Number'
        CONTRACT_NO = 'CONTRACT_NO', 'Contract Document Number'
        PEDIGREE_NO = 'PEDIGREE_NO', 'Pedigree Document Number'

    counter_type = models.CharField(max_length=20, choices=CounterType.choices)
    year = models.SmallIntegerField()
    last_number = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['counter_type', 'year'], name='uq_counter_type_year'),
            models.CheckConstraint(condition=models.Q(last_number__gte=0), name='ck_counter_last_number_gte_0'),
        ]

    def __str__(self):
        return f'{self.counter_type}-{self.year}: {self.last_number}'
