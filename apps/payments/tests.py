"""
STEP5 — CRUD + permission + business-rule coverage for Payment.
"""

import io
import shutil
import tempfile
from datetime import date, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.core.exceptions import AppError
from apps.hens.models import Hen
from apps.payments import services
from apps.payments.models import Payment

FUTURE_DATE = date.today() + timedelta(days=30)


def error_fields(response):
    return response.data['error']['details']


def error_code(response):
    return response.data['error']['code']


def make_slip(name='slip.png'):
    image = Image.new('RGB', (10, 10), color='green')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type='image/png')


_MEDIA_ROOT = tempfile.mkdtemp(prefix='payments_test_media_')


@override_settings(MEDIA_ROOT=_MEDIA_ROOT)
class PaymentCRUDTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.list_url = reverse('payments:payment-list')
        self.admin = User.objects.create_user(username='pm_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='pm_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='pm_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์จ่ายเงิน', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่จ่ายเงิน', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )  # price=1000.00, deposit_amount=300.00, remaining_amount=1000.00

    def detail_url(self, pk):
        return reverse('payments:payment-detail', args=[pk])

    def approve_url(self, pk):
        return reverse('payments:payment-approve', args=[pk])

    def reject_url(self, pk):
        return reverse('payments:payment-reject', args=[pk])

    def create_payload(self, **overrides):
        payload = {
            'booking': self.booking.id, 'payment_type': Payment.PaymentType.DEPOSIT, 'amount': '300.00',
            'slip': make_slip(), 'paid_at': timezone.now().isoformat(),
        }
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Payment Success ---

    def test_customer_can_create_payment(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload(), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = Payment.objects.get(pk=response.data['id'])
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertTrue(payment.payment_number)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.Status.WAITING_PAYMENT)  # unaffected until admin approves

    # --- Ownership (Critical Rule #13 analog for payments) ---

    def test_customer_cannot_pay_for_others_booking(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.post(self.list_url, self.create_payload(), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), 'FORBIDDEN')

    def test_stranger_cannot_view_others_payment(self):
        self.client.force_authenticate(self.customer)
        payment_id = self.client.post(self.list_url, self.create_payload(), format='multipart').data['id']
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(payment_id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Underpayment / Overpayment (Critical Rules #9/#10) ---

    def test_underpayment_deposit_rejected(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload(amount='100.00'), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'UNDERPAYMENT')

    def test_overpayment_rejected(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            self.list_url, self.create_payload(payment_type=Payment.PaymentType.FULL, amount='5000.00'),
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'OVERPAYMENT')

    def test_overpayment_rejected_at_approval_time(self):
        # Two pending submissions can each individually fit under remaining_amount
        # (which only shrinks on APPROVAL), but approving both must not be allowed to
        # push paid_amount past price.
        self.client.force_authenticate(self.customer)
        first_id = self.client.post(
            self.list_url, self.create_payload(payment_type=Payment.PaymentType.FULL, amount='1000.00'),
            format='multipart',
        ).data['id']
        second_id = self.client.post(
            self.list_url, self.create_payload(payment_type=Payment.PaymentType.ADDITIONAL, amount='500.00'),
            format='multipart',
        ).data['id']

        self.client.force_authenticate(self.admin)
        approve_first = self.client.patch(self.approve_url(first_id))
        self.assertEqual(approve_first.status_code, status.HTTP_200_OK, approve_first.data)

        approve_second = self.client.patch(self.approve_url(second_id))
        self.assertEqual(approve_second.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(approve_second), 'OVERPAYMENT')

    # --- Duplicate Payment ---

    def test_duplicate_pending_payment_same_type_rejected(self):
        self.client.force_authenticate(self.customer)
        first = self.client.post(self.list_url, self.create_payload(), format='multipart')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(self.list_url, self.create_payload(), format='multipart')
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(second), 'DUPLICATE_PENDING_PAYMENT')

    # --- Booking already cancelled (Critical Rule #7) ---

    def test_payment_for_cancelled_booking_rejected(self):
        booking_services.cancel_booking(booking_id=self.booking.id, actor=self.customer)
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload(), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_NOT_PAYABLE')

    def test_cancelling_booking_cancels_its_pending_payments(self):
        payment = services.create_payment(
            customer=self.customer, booking=self.booking, payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal('300.00'), slip=make_slip(), paid_at=timezone.now(),
        )
        booking_services.cancel_booking(booking_id=self.booking.id, actor=self.customer)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.CANCELLED)

    # --- Approve / Reject: ADMIN only (Critical Rule #11) ---

    def test_customer_cannot_approve_payment(self):
        self.client.force_authenticate(self.customer)
        payment_id = self.client.post(self.list_url, self.create_payload(), format='multipart').data['id']
        response = self.client.patch(self.approve_url(payment_id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_cannot_reject_payment(self):
        self.client.force_authenticate(self.customer)
        payment_id = self.client.post(self.list_url, self.create_payload(), format='multipart').data['id']
        response = self.client.patch(self.reject_url(payment_id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_approve_payment_and_booking_becomes_paid(self):
        self.client.force_authenticate(self.customer)
        payment_id = self.client.post(self.list_url, self.create_payload(), format='multipart').data['id']

        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.approve_url(payment_id), {'remark': 'สลิปถูกต้อง'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.Status.PAID)
        self.assertEqual(self.booking.paid_amount, Decimal('300.00'))
        self.assertEqual(self.booking.remaining_amount, Decimal('700.00'))

    def test_admin_can_reject_payment(self):
        self.client.force_authenticate(self.customer)
        payment_id = self.client.post(self.list_url, self.create_payload(), format='multipart').data['id']

        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.reject_url(payment_id), {'remark': 'สลิปไม่ชัดเจน'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.Status.WAITING_PAYMENT)  # unaffected
        self.assertEqual(self.booking.paid_amount, Decimal('0'))

    def test_approve_already_approved_payment_rejected(self):
        payment = services.create_payment(
            customer=self.customer, booking=self.booking, payment_type=Payment.PaymentType.DEPOSIT,
            amount=Decimal('300.00'), slip=make_slip(), paid_at=timezone.now(),
        )
        services.approve_payment(payment_id=payment.id, admin=self.admin)
        with self.assertRaises(AppError) as ctx:
            services.approve_payment(payment_id=payment.id, admin=self.admin)
        self.assertEqual(ctx.exception.code, 'INVALID_STATE_TRANSITION')

    # --- Upload validation (Global Rule #28, reuses apps.core.validators) ---

    def test_upload_rejects_non_image_slip(self):
        self.client.force_authenticate(self.customer)
        bogus = SimpleUploadedFile('notes.txt', b'not an image', content_type='text/plain')
        response = self.client.post(self.list_url, self.create_payload(slip=bogus), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('slip', error_fields(response))

    # --- Search / Filter / Pagination ---

    def test_filter_by_status(self):
        self.client.force_authenticate(self.customer)
        self.client.post(self.list_url, self.create_payload(), format='multipart')
        response = self.client.get(self.list_url, {'status': Payment.Status.PENDING})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_search_by_payment_number(self):
        self.client.force_authenticate(self.customer)
        created = self.client.post(self.list_url, self.create_payload(), format='multipart').data
        response = self.client.get(self.list_url, {'search': created['payment_number']})
        self.assertEqual(response.data['count'], 1)
