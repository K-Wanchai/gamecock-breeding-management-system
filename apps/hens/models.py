from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Hen(TimeStampedModel):
    """STEP1 §4.4 — แม่ไก่ของลูกค้า."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'ใช้งานอยู่'
        INACTIVE = 'INACTIVE', 'ไม่ใช้งาน'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='hens',
    )
    name = models.CharField(max_length=150)
    breed = models.CharField(max_length=150, blank=True, null=True)
    history = models.TextField(blank=True, null=True)
    image_path = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        return self.owner_id

    def __str__(self):
        return f'{self.name} ({self.owner.username})'
