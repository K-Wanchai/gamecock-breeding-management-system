import uuid

from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


class Document(TimeStampedModel):
    """STEP1 §4.13 — เอกสาร 3 ประเภท (สัญญา/ใบรับรองสายพันธุ์/ใบส่งมอบ), ดู STEP1 §15 #4 สำหรับเหตุผลที่รวมเป็นตารางเดียว."""

    class DocumentType(models.TextChoices):
        CONTRACT = 'CONTRACT', 'ใบรับฝากผสม/สัญญา'
        PEDIGREE_CERTIFICATE = 'PEDIGREE_CERTIFICATE', 'ใบรับรองสายพันธุ์'
        DELIVERY_HISTORY = 'DELIVERY_HISTORY', 'เอกสารส่งมอบ'

    public_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    document_type = models.CharField(max_length=25, choices=DocumentType.choices, db_index=True)
    document_no = models.CharField(max_length=30, unique=True)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='documents', blank=True, null=True)
    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='documents', blank=True, null=True)
    file_path = models.CharField(max_length=255, blank=True, null=True)
    generated_at = models.DateTimeField(blank=True, null=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='documents_generated',
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(document_type='CONTRACT', booking__isnull=False, chick__isnull=True)
                    | models.Q(document_type__in=['PEDIGREE_CERTIFICATE', 'DELIVERY_HISTORY'], chick__isnull=False)
                ),
                name='ck_document_ownership_by_type',
            ),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        if self.booking_id:
            return self.booking.customer_id
        return self.chick.get_owner_user_id()

    def __str__(self):
        return self.document_no
