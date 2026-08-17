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
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CUSTOMER, db_index=True)
    line_user_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    # STEP9 — self-service LINE account linking (apps.notifications.services.generate_line_link_code /
    # process_line_webhook_event): a short-lived 6-digit code the user sends as a LINE message to
    # prove they control that LINE account, letting the webhook set line_user_id above.
    line_link_code = models.CharField(max_length=6, blank=True, null=True, db_index=True)
    line_link_code_expires_at = models.DateTimeField(blank=True, null=True)

    updated_at = models.DateTimeField(auto_now=True)

    # NOTE: email/phone/line_user_id use field-level unique=True. PostgreSQL treats
    # NULL <> NULL, so a UNIQUE index already allows unlimited NULLs while still
    # enforcing uniqueness on any actual value — no extra conditional constraint needed.

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN

    def save(self, *args, **kwargs):
        # Django's default field handling (and UserManager.normalize_email) turns an
        # omitted value into '' rather than None, which would violate these UNIQUE
        # columns the moment a second user is created without one. Normalize here so
        # every creation path (createsuperuser, create_user, serializers, admin) is safe.
        self.email = self.email or None
        self.phone = self.phone or None
        self.line_user_id = self.line_user_id or None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
