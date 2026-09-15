from django.db import models


class FarmSetting(models.Model):
    """
    Singleton row (pk=1) — admin-editable farm configuration that the frontend
    reads at runtime (bank account, PromptPay, farm name/address for emails).
    Use FarmSetting.load() everywhere instead of instantiating directly.
    """

    farm_name = models.CharField(max_length=200, default='ฟาร์มไก่ชน')
    farm_address = models.TextField(blank=True, default='')
    bank_name = models.CharField(max_length=100, blank=True, default='')
    account_number = models.CharField(max_length=50, blank=True, default='')
    account_holder = models.CharField(max_length=200, blank=True, default='')
    promptpay = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        verbose_name = 'Farm Setting'

    @classmethod
    def load(cls) -> 'FarmSetting':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


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
        # Human-readable Booking.booking_number (NOT the per-breeder-per-month queue
        # slot number — that one is computed inside the locked BreederMonthlyQuota
        # transaction in apps.bookings.services.lock_booking_slot, since it must be
        # scoped per (breeder, year, month) rather than per year like this counter).
        BOOKING_QUEUE = 'BOOKING_QUEUE', 'Booking Number'
        CONTRACT_NO = 'CONTRACT_NO', 'Contract Document Number'
        PEDIGREE_NO = 'PEDIGREE_NO', 'Pedigree Document Number'
        DELIVERY_NO = 'DELIVERY_NO', 'Delivery Document Number'
        PAYMENT_NO = 'PAYMENT_NO', 'Payment Number'

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
