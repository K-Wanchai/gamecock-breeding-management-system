import uuid

from django.conf import settings
from django.db import models

from apps.bookings.models import Booking
from apps.chicks.models import Chick
from apps.core.models import TimeStampedModel


def document_upload_path(instance, filename):
    return f'documents/{instance.document_type.lower()}/{instance.document_number}.pdf'


class Document(TimeStampedModel):
    """
    STEP1 §4.13 / STEP8 — เอกสาร 3 ประเภท (สัญญา/ใบรับรองสายพันธุ์/ใบส่งมอบ), ดู STEP1 §15 #4
    สำหรับเหตุผลที่รวมเป็นตารางเดียว. STEP8 builds generation + PDF rendering for
    PEDIGREE_CERTIFICATE and DELIVERY_DOCUMENT (both chick-based); CONTRACT (booking-based)
    stays as an untouched STEP1-era scaffold — its generation flow is out of STEP8 scope.
    """

    class DocumentType(models.TextChoices):
        CONTRACT = 'CONTRACT', 'ใบรับฝากผสม/สัญญา'
        PEDIGREE_CERTIFICATE = 'PEDIGREE_CERTIFICATE', 'ใบรับรองสายพันธุ์'
        DELIVERY_DOCUMENT = 'DELIVERY_DOCUMENT', 'เอกสารส่งมอบ'

    public_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    document_type = models.CharField(max_length=25, choices=DocumentType.choices, db_index=True)
    document_number = models.CharField(max_length=30, unique=True, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='documents', blank=True, null=True)
    chick = models.ForeignKey(Chick, on_delete=models.CASCADE, related_name='documents', blank=True, null=True)
    file_path = models.FileField(upload_to=document_upload_path, max_length=255, blank=True, null=True)
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
                    | models.Q(document_type__in=['PEDIGREE_CERTIFICATE', 'DELIVERY_DOCUMENT'], chick__isnull=False)
                ),
                name='ck_document_ownership_by_type',
            ),
            # Duplicate Prevention (Global Rule #29): at most one of each document
            # type per chick. apps.documents.services.generate_document() pre-checks
            # this (friendly 409) and select_for_update()s the Chick row so concurrent
            # requests are serialized — this constraint is the authoritative backstop.
            models.UniqueConstraint(
                fields=['chick', 'document_type'], condition=models.Q(chick__isnull=False),
                name='uq_document_chick_type',
            ),
        ]

    def get_owner_user_id(self):
        """STEP1 §12 Data Ownership Matrix — used by apps.core.permissions.IsOwnerOrAdmin."""
        if self.booking_id:
            return self.booking.customer_id
        return self.chick.get_owner_user_id()

    def __str__(self):
        return self.document_number
