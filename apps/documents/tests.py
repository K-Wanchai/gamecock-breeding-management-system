"""
STEP8 — Document generation (PEDIGREE_CERTIFICATE / DELIVERY_DOCUMENT) coverage:
number generation, duplicate/concurrency protection, PDF generation/permission/
data-accuracy, and ownership tests.
"""

import shutil
import tempfile
import threading
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from pypdf import PdfReader
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding import services as breeding_services
from apps.chicks import services as chick_services
from apps.core.exceptions import AppError
from apps.hatching import services as hatching_services
from apps.health import services as health_services
from apps.hens.models import Hen
from apps.vaccinations import services as vaccination_services

from apps.documents import services
from apps.documents.models import Document

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()

_MEDIA_ROOT = tempfile.mkdtemp(prefix='documents_test_media_')


def error_code(response):
    return response.data['error']['code']


def pdf_text(document):
    reader = PdfReader(document.file_path.open('rb'))
    return '\n'.join(page.extract_text() or '' for page in reader.pages)


class DocumentTestBase:
    """Mixin: builds one full Booking -> Egg -> Hatching -> Chick chain, with a
    breeding event, a health record and a vaccination, so generated PDFs have
    real content to assert against."""

    def build_chick(self, *, breeder_name, hen_name, customer):
        breeder = Breeder.objects.create(
            name=breeder_name, breed='พม่า', bloodline='สายเลือดทดสอบ', service_rate=Decimal('1000.00'),
            default_monthly_quota=5, status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        hen = Hen.objects.create(owner=customer, name=hen_name, breed='ไทย', status=Hen.Status.ACTIVE)
        booking = booking_services.create_booking(
            customer=customer, hen=hen, breeder=breeder, booking_date=FUTURE_DATE,
        )
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=booking.id, admin=self.admin)
        booking.refresh_from_db()

        breeding_services.record_breeding_event(
            booking_id=booking.id, status='RECEIVED', event_date=TODAY, recorded_by=self.admin,
        )
        egg = breeding_services.record_egg(
            booking_id=booking.id, total_eggs=5, good_eggs=5, bad_eggs=0, egg_date=TODAY, recorded_by=self.admin,
        )
        hatching = hatching_services.start_hatching(egg_id=egg.id, started_at=TODAY, recorded_by=self.admin)
        hatching_services.complete_hatching(
            hatching_id=hatching.id, completed_at=TODAY, hatched_count=2, survival_count=2, actor=self.admin,
        )
        hatching.refresh_from_db()
        chick = chick_services.create_chick(hatching_id=hatching.id, birth_date=TODAY, name='ไก่ทดสอบ')
        health_services.record_health(
            chick_id=chick.id, record_date=TODAY, weight=Decimal('50.5'), symptom='ปกติ', recorded_by=self.admin,
        )
        vaccination_services.record_vaccination(
            chick_id=chick.id, vaccine_name='Newcastle Disease', vaccination_date=TODAY, dose_number=1,
            recorded_by=self.admin,
        )
        return chick


@override_settings(MEDIA_ROOT=_MEDIA_ROOT)
class DocumentGenerateTests(DocumentTestBase, APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.admin = User.objects.create_user(username='doc_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='doc_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='doc_stranger', password='x', role=User.Role.CUSTOMER)
        self.chick = self.build_chick(breeder_name='พ่อพันธุ์เอกสาร', hen_name='แม่ไก่เอกสาร', customer=self.customer)

        self.list_url = reverse('documents:document-list')

    def detail_url(self, pk):
        return reverse('documents:document-detail', args=[pk])

    def download_url(self, pk):
        return reverse('documents:document-download', args=[pk])

    def create_payload(self, **overrides):
        payload = {'chick': self.chick.id, 'document_type': Document.DocumentType.PEDIGREE_CERTIFICATE}
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Generate Number ---

    def test_admin_can_generate_pedigree_certificate(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        document = Document.objects.get(pk=response.data['id'])
        self.assertTrue(document.document_number.startswith('PD-'))
        self.assertEqual(document.chick_id, self.chick.id)
        self.assertIsNotNone(document.generated_at)
        self.assertEqual(document.generated_by, self.admin)

    def test_admin_can_generate_delivery_document(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(document_type=Document.DocumentType.DELIVERY_DOCUMENT))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        document = Document.objects.get(pk=response.data['id'])
        self.assertTrue(document.document_number.startswith('DL-'))

    def test_document_numbers_increment_sequentially(self):
        other_chick = self.build_chick(breeder_name='พ่อพันธุ์เอกสาร 2', hen_name='แม่ไก่เอกสาร 2', customer=self.customer)
        first = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        second = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=other_chick.id, actor=self.admin,
        )
        first_seq = int(first.document_number.rsplit('-', 1)[1])
        second_seq = int(second.document_number.rsplit('-', 1)[1])
        self.assertEqual(second_seq, first_seq + 1)

    def test_invalid_document_type_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(document_type=Document.DocumentType.CONTRACT))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_document_type_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.generate_document(document_type='CONTRACT', chick_id=self.chick.id, actor=self.admin)
        self.assertEqual(ctx.exception.code, 'INVALID_DOCUMENT_TYPE')

    # --- Error: Chick ไม่มี ---

    def test_invalid_chick_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(chick=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_chick_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.generate_document(
                document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=999999, actor=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'CHICK_NOT_FOUND')

    # --- Duplicate Prevention ---

    def test_duplicate_generation_rejected(self):
        self.client.force_authenticate(self.admin)
        first = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(second), 'DUPLICATE_DOCUMENT')

    def test_different_document_types_both_allowed_for_same_chick(self):
        self.client.force_authenticate(self.admin)
        pedigree = self.client.post(self.list_url, self.create_payload())
        delivery = self.client.post(self.list_url, self.create_payload(document_type=Document.DocumentType.DELIVERY_DOCUMENT))
        self.assertEqual(pedigree.status_code, status.HTTP_201_CREATED)
        self.assertEqual(delivery.status_code, status.HTTP_201_CREATED, delivery.data)

    def test_duplicate_document_database_constraint(self):
        services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        with self.assertRaises(AppError) as ctx:
            services.generate_document(
                document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'DUPLICATE_DOCUMENT')

    # --- PDF Generate ---

    def test_generated_file_is_a_real_pdf(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        self.assertTrue(document.file_path.name.endswith('.pdf'))
        with document.file_path.open('rb') as f:
            header = f.read(5)
        self.assertEqual(header, b'%PDF-')

    def test_download_returns_pdf_content_type(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.download_url(document.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_pdf_generate_error_wrapped_and_no_row_left_behind(self):
        with patch('apps.documents.services.render_document_pdf', side_effect=RuntimeError('boom')):
            with self.assertRaises(AppError) as ctx:
                services.generate_document(
                    document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
                )
        self.assertEqual(ctx.exception.code, 'PDF_GENERATE_ERROR')
        self.assertEqual(ctx.exception.http_status, 500)
        self.assertFalse(Document.objects.filter(chick_id=self.chick.id).exists())  # transaction rolled back

    # --- Error: File Missing ---

    def test_download_missing_file_returns_file_missing(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        document.file_path.delete(save=True)  # simulate the file being lost from storage
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.download_url(document.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(error_code(response), 'FILE_MISSING')

    # --- PDF Permission ---

    def test_customer_cannot_generate_document(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_download_own_document(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.download_url(document.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stranger_cannot_download_others_document(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.download_url(document.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- PDF Data Accuracy ---

    def test_pdf_contains_accurate_data(self):
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        text = pdf_text(document)
        self.assertIn(document.document_number, text)
        self.assertIn(self.customer.username, text)
        self.assertIn('พ่อพันธุ์เอกสาร', text)  # breeder name
        self.assertIn('แม่ไก่เอกสาร', text)  # hen name
        self.assertIn(self.chick.wing_clip_number, text)
        self.assertIn('Newcastle Disease', text)  # vaccination
        self.assertIn('รับแม่ไก่เข้าฟาร์ม', text)  # breeding history status (Thai display label)

    def test_pdf_does_not_leak_other_chicks_data(self):
        other_chick = self.build_chick(breeder_name='พ่อพันธุ์อื่น', hen_name='แม่ไก่อื่น', customer=self.customer)
        document = services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        text = pdf_text(document)
        self.assertNotIn(other_chick.wing_clip_number, text)

    # --- Document Ownership ---

    def test_customer_sees_only_own_documents(self):
        services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        stranger_chick = self.build_chick(breeder_name='พ่อพันธุ์คนอื่น', hen_name='แม่ไก่คนอื่น', customer=self.stranger)
        services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=stranger_chick.id, actor=self.admin,
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_admin_sees_all_documents(self):
        services.generate_document(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)


@override_settings(MEDIA_ROOT=_MEDIA_ROOT)
class DocumentConcurrencyTests(DocumentTestBase, TransactionTestCase):
    """Real concurrency coverage (Global Rule #19 — Concurrent Number): two threads
    racing to generate the same (chick, document_type) must not both succeed."""

    def setUp(self):
        self.admin = User.objects.create_user(username='doc_race_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='doc_race_customer', password='x', role=User.Role.CUSTOMER)
        self.chick = self.build_chick(breeder_name='พ่อพันธุ์แข่งขันเอกสาร', hen_name='แม่ไก่แข่งขันเอกสาร', customer=self.customer)

    def test_concurrent_generate_only_one_succeeds(self):
        results = []
        barrier = threading.Barrier(2)

        def attempt():
            barrier.wait()
            try:
                document = services.generate_document(
                    document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, chick_id=self.chick.id, actor=self.admin,
                )
                results.append(('ok', document.id))
            except AppError as exc:
                results.append(('error', exc.code))
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r[0] == 'ok']
        failures = [r for r in results if r[0] == 'error']
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0][1], 'DUPLICATE_DOCUMENT')
        self.assertEqual(
            Document.objects.filter(chick=self.chick, document_type=Document.DocumentType.PEDIGREE_CERTIFICATE).count(), 1,
        )
