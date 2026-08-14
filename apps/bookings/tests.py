"""
STEP5 — CRUD + permission + business-rule + concurrency coverage for Booking.
"""

import threading
from datetime import date, timedelta
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.core.exceptions import AppError
from apps.hens.models import Hen

FUTURE_DATE = date.today() + timedelta(days=30)


def error_fields(response):
    return response.data['error']['details']


def error_code(response):
    return response.data['error']['code']


class BookingCRUDTests(APITestCase):
    def setUp(self):
        self.list_url = reverse('bookings:booking-list')
        self.admin = User.objects.create_user(username='bk_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='bk_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='bk_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์จอง', service_rate=Decimal('1000.00'), default_monthly_quota=1,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่จอง', status=Hen.Status.ACTIVE)

    def detail_url(self, pk):
        return reverse('bookings:booking-detail', args=[pk])

    def approve_url(self, pk):
        return reverse('bookings:booking-approve', args=[pk])

    def cancel_url(self, pk):
        return reverse('bookings:booking-cancel', args=[pk])

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Booking Success ---

    def test_customer_can_create_booking(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
            'note': 'จองทดสอบ',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.status, Booking.Status.WAITING_PAYMENT)
        self.assertEqual(booking.price, Decimal('1000.00'))
        self.assertEqual(booking.deposit_amount, Decimal('300.00'))  # 30% policy
        self.assertEqual(booking.remaining_amount, Decimal('1000.00'))
        self.assertTrue(booking.booking_number)

    def test_create_ignores_client_supplied_price_and_status(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
            'price': '1', 'status': Booking.Status.APPROVED,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(pk=response.data['id'])
        self.assertEqual(booking.price, Decimal('1000.00'))  # never the client-supplied '1'
        self.assertEqual(booking.status, Booking.Status.WAITING_PAYMENT)  # never client-supplied APPROVED

    # --- Ownership / IDOR (Critical Rule #13) ---

    def test_customer_cannot_book_with_others_hen(self):
        other_hen = Hen.objects.create(owner=self.stranger, name='แม่ไก่คนอื่น', status=Hen.Status.ACTIVE)
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': other_hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), 'HEN_NOT_OWNED')

    # --- Validation ---

    def test_create_rejects_inactive_hen(self):
        self.hen.status = Hen.Status.INACTIVE
        self.hen.save(update_fields=['status'])
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'HEN_INACTIVE')

    def test_create_rejects_inactive_breeder(self):
        self.breeder.status = Breeder.Status.INACTIVE
        self.breeder.save(update_fields=['status'])
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BREEDER_INACTIVE')

    def test_create_rejects_past_date(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': '2020-01-01',
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_DATE_IN_PAST')

    def test_create_missing_field_rejected(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {'breeder': self.breeder.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('hen', error_fields(response))

    # --- Duplicate Booking ---

    def test_duplicate_booking_on_same_hen_rejected(self):
        self.client.force_authenticate(self.customer)
        first = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': FUTURE_DATE.isoformat(),
        })
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(self.list_url, {
            'hen': self.hen.id, 'breeder': self.breeder.id, 'booking_date': (FUTURE_DATE + timedelta(days=1)).isoformat(),
        })
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(second), 'HEN_ALREADY_BOOKED')

    # --- List scoping / Ownership ---

    def test_customer_sees_only_own_bookings(self):
        other_hen = Hen.objects.create(owner=self.stranger, name='แม่ไก่คนอื่น', status=Hen.Status.ACTIVE)
        services.create_booking(customer=self.stranger, hen=other_hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)

        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_admin_sees_all_bookings(self):
        other_hen = Hen.objects.create(owner=self.stranger, name='แม่ไก่คนอื่น', status=Hen.Status.ACTIVE)
        services.create_booking(customer=self.stranger, hen=other_hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)

        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 2)

    def test_stranger_cannot_retrieve_others_booking(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Approve: ADMIN only (Critical Rule #12) ---

    def test_customer_cannot_approve_own_booking(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.customer)
        response = self.client.patch(self.approve_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_approve_before_paid(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.approve_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'INVALID_STATE_TRANSITION')

    def test_admin_can_approve_paid_booking_and_locks_queue(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.remaining_amount = booking.price - booking.paid_amount
        booking.save(update_fields=['status', 'paid_amount', 'remaining_amount'])

        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.approve_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.APPROVED)
        self.assertEqual(booking.queue_no, 1)
        self.assertIsNotNone(booking.locked_at)
        self.assertEqual(booking.approved_by, self.admin)

    def test_full_queue_rejects_further_approval(self):
        # default_monthly_quota=1 on self.breeder, so a second PAID booking cannot be locked.
        hen2 = Hen.objects.create(owner=self.customer, name='แม่ไก่สอง', status=Hen.Status.ACTIVE)
        b1 = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        b2 = services.create_booking(customer=self.customer, hen=hen2, breeder=self.breeder, booking_date=FUTURE_DATE)
        for b in (b1, b2):
            b.status = Booking.Status.PAID
            b.paid_amount = b.deposit_amount
            b.save(update_fields=['status', 'paid_amount'])

        services.approve_booking(booking_id=b1.id, admin=self.admin)
        with self.assertRaises(AppError) as ctx:
            services.approve_booking(booking_id=b2.id, admin=self.admin)
        self.assertEqual(ctx.exception.code, 'QUEUE_FULL')
        self.assertEqual(ctx.exception.http_status, status.HTTP_409_CONFLICT)

    # --- Cancel Booking ---

    def test_customer_can_cancel_own_booking_before_approval(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.customer)
        response = self.client.patch(self.cancel_url(booking.id), {'reason': 'เปลี่ยนใจ'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertEqual(booking.cancelled_by, self.customer)
        self.assertEqual(booking.cancel_reason, 'เปลี่ยนใจ')

    def test_customer_cannot_cancel_others_booking(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.stranger)
        response = self.client.patch(self.cancel_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_cancel_after_approval(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.save(update_fields=['status', 'paid_amount'])
        services.approve_booking(booking_id=booking.id, admin=self.admin)

        self.client.force_authenticate(self.customer)
        response = self.client.patch(self.cancel_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_ALREADY_APPROVED')

    def test_admin_can_cancel_approved_booking_and_frees_queue_slot(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.save(update_fields=['status', 'paid_amount'])
        services.approve_booking(booking_id=booking.id, admin=self.admin)

        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.cancel_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertIsNone(booking.queue_no)  # slot released

    def test_cancel_already_cancelled_booking_rejected(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.customer)
        self.client.patch(self.cancel_url(booking.id))
        response = self.client.patch(self.cancel_url(booking.id))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_NOT_CANCELLABLE')

    # --- Search / Filter / Pagination ---

    def test_filter_by_status(self):
        services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url, {'status': Booking.Status.WAITING_PAYMENT})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_search_by_booking_number(self):
        booking = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url, {'search': booking.booking_number})
        self.assertEqual(response.data['count'], 1)


class ConcurrentBookingTests(TransactionTestCase):
    """
    Real concurrency coverage (Critical Rules #3/#4): two threads racing to book the
    same hen, and two threads racing for the last queue slot of a breeder's month.
    Uses TransactionTestCase (real commits, real row locks) + separate DB connections
    per thread, not the mocked/serialized TestCase transaction wrapper.
    """

    def setUp(self):
        self.admin = User.objects.create_user(username='race_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='race_customer', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์แข่งขัน', service_rate=Decimal('1000.00'), default_monthly_quota=1,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่แข่งขัน', status=Hen.Status.ACTIVE)

    def test_concurrent_booking_on_same_hen_only_one_succeeds(self):
        results = []
        barrier = threading.Barrier(2)

        def attempt():
            barrier.wait()
            try:
                booking = services.create_booking(
                    customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
                )
                results.append(('ok', booking.id))
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
        self.assertEqual(failures[0][1], 'HEN_ALREADY_BOOKED')
        self.assertEqual(
            Booking.objects.filter(hen=self.hen, status__in=Booking.ACTIVE_STATUSES).count(), 1,
        )

    def test_concurrent_queue_approval_only_one_gets_the_last_slot(self):
        hen2 = Hen.objects.create(owner=self.customer, name='แม่ไก่แข่งขันสอง', status=Hen.Status.ACTIVE)
        b1 = services.create_booking(customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE)
        b2 = services.create_booking(customer=self.customer, hen=hen2, breeder=self.breeder, booking_date=FUTURE_DATE)
        for b in (b1, b2):
            b.status = Booking.Status.PAID
            b.paid_amount = b.deposit_amount
            b.save(update_fields=['status', 'paid_amount'])

        results = []
        barrier = threading.Barrier(2)

        def attempt(booking_id):
            barrier.wait()
            try:
                booking = services.approve_booking(booking_id=booking_id, admin=self.admin)
                results.append(('ok', booking.queue_no))
            except AppError as exc:
                results.append(('error', exc.code))
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt, args=(b.id,)) for b in (b1, b2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successes = [r for r in results if r[0] == 'ok']
        failures = [r for r in results if r[0] == 'error']
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(failures), 1)
        self.assertEqual(successes[0][1], 1)
        self.assertEqual(failures[0][1], 'QUEUE_FULL')
