"""
STEP7 — hatching lifecycle (start/complete) coverage: permission, business-rule,
validation and hatching_rate calculation tests.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding import services as breeding_services
from apps.breeding.models import Egg
from apps.core.exceptions import AppError
from apps.hens.models import Hen

from apps.hatching import services
from apps.hatching.models import Hatching

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()


def error_code(response):
    return response.data['error']['code']


class HatchingTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='htc_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='htc_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='htc_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์ฟัก', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่ฟัก', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.booking.status = Booking.Status.PAID
        self.booking.paid_amount = self.booking.deposit_amount
        self.booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)
        self.booking.refresh_from_db()

        self.egg = breeding_services.record_egg(
            booking_id=self.booking.id, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
        )


class HatchingStartTests(HatchingTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('hatching:hatching-list')

    def detail_url(self, pk):
        return reverse('hatching:hatching-detail', args=[pk])

    def complete_url(self, pk):
        return reverse('hatching:hatching-complete', args=[pk])

    def create_payload(self, **overrides):
        payload = {'egg': self.egg.id, 'started_at': TODAY.isoformat()}
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Admin Access / Success (Hatching) ---

    def test_admin_can_start_hatching(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        hatching = Hatching.objects.get(pk=response.data['id'])
        self.assertEqual(hatching.total_eggs, 10)  # snapshotted from egg.total_eggs
        self.assertEqual(hatching.status, Hatching.Status.INCUBATING)

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_start_hatching(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Invalid egg ---

    def test_invalid_egg_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(egg=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_egg_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.start_hatching(egg_id=999999, started_at=TODAY, recorded_by=self.admin)
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    # --- Date Validation ---

    def test_started_at_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(started_at=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'STARTED_AT_IN_FUTURE')

    # --- Complete: success ---

    def test_admin_can_complete_hatching_as_hatched(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': 7, 'failed_count': 3, 'survival_count': 6,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        hatching.refresh_from_db()
        self.assertEqual(hatching.status, Hatching.Status.HATCHED)
        self.assertEqual(hatching.survival_count, 6)

    def test_complete_with_zero_hatched_marks_failed(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': 0, 'failed_count': 10,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        hatching.refresh_from_db()
        self.assertEqual(hatching.status, Hatching.Status.FAILED)

    def test_customer_cannot_complete_hatching(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.customer)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': 7, 'failed_count': 3,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_complete_already_completed_rejected(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        services.complete_hatching(
            hatching_id=hatching.id, completed_at=TODAY, hatched_count=7, failed_count=3, actor=self.admin,
        )
        with self.assertRaises(AppError) as ctx:
            services.complete_hatching(
                hatching_id=hatching.id, completed_at=TODAY, hatched_count=7, failed_count=3, actor=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'INVALID_STATE_TRANSITION')

    # --- Invalid Count ---

    def test_hatched_plus_failed_exceeds_total_rejected(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': 8, 'failed_count': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'INVALID_HATCHING_COUNT')

    def test_survival_exceeds_hatched_rejected(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': 5, 'survival_count': 6,
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'INVALID_HATCHING_COUNT')

    def test_negative_count_rejected_by_serializer(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': TODAY.isoformat(), 'hatched_count': -1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Date Validation (complete) ---

    def test_completed_at_before_started_at_rejected(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': (TODAY - timedelta(days=1)).isoformat(), 'hatched_count': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'COMPLETED_AT_BEFORE_STARTED_AT')

    def test_completed_at_in_future_rejected(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.complete_url(hatching.id), {
            'completed_at': FUTURE_DATE.isoformat(), 'hatched_count': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'COMPLETED_AT_IN_FUTURE')

    # --- Ownership ---

    def test_customer_can_read_own_hatching(self):
        services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_stranger_cannot_read_others_hatching(self):
        hatching = services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(hatching.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_hatching(self):
        services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)


class CalculateHatchingRateTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='htc_rate_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='htc_rate_customer', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(name='พ่อพันธุ์เรทฟัก', service_rate=1000, created_by=self.admin)
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่เรทฟัก')
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.egg = Egg.objects.create(
            booking=self.booking, total_eggs=10, good_eggs=10, bad_eggs=0, egg_date=TODAY, recorded_by=self.admin,
        )

    def test_rate_computed_as_percentage(self):
        hatching = Hatching.objects.create(
            egg=self.egg, started_at=TODAY, total_eggs=10, hatched_count=8, status=Hatching.Status.HATCHED,
            recorded_by=self.admin,
        )
        self.assertEqual(services.calculate_hatching_rate(hatching), Decimal('80.00'))

    def test_rate_zero_when_no_eggs(self):
        egg_zero = Egg.objects.create(
            booking=self.booking, total_eggs=0, good_eggs=0, bad_eggs=0, egg_date=TODAY, recorded_by=self.admin,
        )
        hatching = Hatching.objects.create(
            egg=egg_zero, started_at=TODAY, total_eggs=0, hatched_count=0, recorded_by=self.admin,
        )
        self.assertEqual(services.calculate_hatching_rate(hatching), Decimal('0.00'))
