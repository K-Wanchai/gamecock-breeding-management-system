"""
Business logic for Document generation (STEP8). Kept out of views.py per Global
Rule #16. generate_document() runs inside transaction.atomic() and takes
select_for_update() on the Chick row (Global Rules #18/#19) so two concurrent
generate calls for the same (chick, document_type) are fully serialized — the
loser observes the winner's already-committed row on the duplicate pre-check
instead of racing on the INSERT (same outcome as apps.breeding.services.
record_breeding_event in STEP6).
"""

from django.core.exceptions import ObjectDoesNotExist
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.chicks.models import Chick
from apps.core.exceptions import AppError
from apps.core.models import RunningNumberCounter
from apps.core.services import format_delivery_number, format_pedigree_number, next_running_number

from apps.documents.models import Document
from apps.documents.pdf import render_document_pdf

# CONTRACT is booking-based and out of STEP8 scope (see apps.documents.models.Document
# docstring) — only these two chick-based types can be generated via this service.
_NUMBER_GENERATORS = {
    Document.DocumentType.PEDIGREE_CERTIFICATE: (RunningNumberCounter.CounterType.PEDIGREE_NO, format_pedigree_number),
    Document.DocumentType.DELIVERY_DOCUMENT: (RunningNumberCounter.CounterType.DELIVERY_NO, format_delivery_number),
}


@transaction.atomic
def generate_document(*, document_type: str, chick_id, actor) -> Document:
    if document_type not in _NUMBER_GENERATORS:
        raise AppError(
            'INVALID_DOCUMENT_TYPE', f'{document_type} cannot be generated through this endpoint.', http_status=422,
        )

    try:
        # STEP10 — prefetch_related() added alongside the existing select_related()
        # chain: render_document_pdf() (apps/documents/pdf.py) reads
        # booking.breeding_events / chick.health_records / chick.vaccinations,
        # which were previously 3 unprefetched queries per PDF generated.
        chick = Chick.objects.select_for_update().select_related(
            'hatching__egg__booking__customer', 'hatching__egg__booking__breeder', 'hatching__egg__booking__hen',
        ).prefetch_related(
            'hatching__egg__booking__breeding_events', 'health_records', 'vaccinations',
        ).get(pk=chick_id)
    except Chick.DoesNotExist:
        raise AppError('CHICK_NOT_FOUND', 'Chick not found.', http_status=404)

    try:
        booking = chick.hatching.egg.booking
    except ObjectDoesNotExist:
        # Defense-in-depth only: Chick.hatching / Hatching.egg / Egg.booking are all
        # non-nullable PROTECT FKs, so this chain cannot actually be broken in practice.
        raise AppError('BOOKING_NOT_FOUND', 'Booking not found for this chick.', http_status=404)

    if Document.objects.filter(chick_id=chick.id, document_type=document_type).exists():
        raise AppError(
            'DUPLICATE_DOCUMENT', f'A {document_type} has already been generated for this chick.', http_status=409,
        )

    counter_type, format_number = _NUMBER_GENERATORS[document_type]
    year = timezone.localdate().year
    document_number = format_number(year, next_running_number(counter_type, year))

    document = Document(
        document_type=document_type, document_number=document_number, chick=chick,
        generated_at=timezone.now(), generated_by=actor,
    )

    try:
        pdf_bytes = render_document_pdf(document, chick)
    except Exception as exc:
        raise AppError('PDF_GENERATE_ERROR', 'Failed to generate the PDF document.', http_status=500) from exc

    document.file_path.save(f'{document_number}.pdf', ContentFile(pdf_bytes), save=False)

    try:
        with transaction.atomic():
            document.save()
    except IntegrityError:
        raise AppError(
            'DUPLICATE_DOCUMENT', f'A {document_type} has already been generated for this chick.', http_status=409,
        )

    return document


def get_document_file(document: Document):
    """Returns the FieldFile for `document`, raising AppError('FILE_MISSING') if
    the row has no file attached or the underlying storage object is gone."""
    if not document.file_path or not document.file_path.storage.exists(document.file_path.name):
        raise AppError('FILE_MISSING', 'The generated file for this document could not be found.', http_status=404)
    return document.file_path
