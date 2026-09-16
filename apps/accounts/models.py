from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    STEP1 §4.1. Extends Django's AbstractUser (username/password/email/is_active/
    date_joined already provided) with the fields the design calls for.
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'ผู้ดูแลระบบ'
        CUSTOMER = 'CUSTOMER', 'ลูกค้า'

    email = models.EmailField(blank=True, null=True, unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True, unique=True)
    address = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CUSTOMER, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # NOTE: email/phone/line_user_id use field-level unique=True. PostgreSQL treats
    # NULL <> NULL, so a UNIQUE index already allows unlimited NULLs while still
    # enforcing uniqueness on any actual value — no extra conditional constraint needed.

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN

    def save(self, *args, **kwargs):
        self.email = self.email or None
        self.phone = self.phone or None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
