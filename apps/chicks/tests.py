"""STEP7 — Chick creation coverage: permission, count-cap and validation tests."""

from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding import services as breeding_services
from apps.core.exceptions import AppError
from apps.hatching import services as hatching_services
from apps.hens.models import Hen

from apps.chicks import services
from apps.chicks.models import Chick

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()


def error_code(response):
    return response.data['error']['code']


class ChickTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='chk_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='chk_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='chk_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์ลูกไก่', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่ลูกไก่', status=Hen.Status.ACTIVE)
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
        self.hatching = hatching_services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        hatching_services.complete_hatching(
            hatching_id=self.hatching.id, completed_at=TODAY, hatched_count=2, failed_count=8, actor=self.admin,
        )
        self.hatching.refresh_from_db()


class ChickCRUDTests(ChickTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('chicks:chick-list')

    def detail_url(self, pk):
        return reverse('chicks:chick-detail', args=[pk])

    def create_payload(self, **overrides):
        payload = {'hatching': self.hatching.id, 'birth_date': TODAY.isoformat(), 'name': 'ลูกไก่ตัวที่ 1'}
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Admin Access / Success ---

    def test_admin_can_create_chick(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        chick = Chick.objects.get(pk=response.data['id'])
        self.assertTrue(chick.wing_clip_number)
        self.assertEqual(chick.booking_id, self.booking.id)

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_create_chick(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Prevent: creating from nonexistent Hatching ---

    def test_invalid_hatching_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(hatching=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_hatching_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.create_chick(hatching_id=999999, birth_date=TODAY)
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    def test_hatching_not_yet_hatched_rejected(self):
        incubating = hatching_services.start_hatching(egg_id=self.egg.id, started_at=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(hatching=incubating.id))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'CHICK_CREATION_REQUIRES_HATCHED_BATCH')

    # --- Chick Count / Prevent: exceeding hatched_count ---

    def test_can_create_up_to_hatched_count(self):
        self.client.force_authenticate(self.admin)
        first = self.client.post(self.list_url, self.create_payload())
        second = self.client.post(self.list_url, self.create_payload(name='ลูกไก่ตัวที่ 2'))
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Chick.objects.filter(hatching=self.hatching).count(), 2)

    def test_exceeding_hatched_count_rejected(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.list_url, self.create_payload())
        self.client.post(self.list_url, self.create_payload(name='ลูกไก่ตัวที่ 2'))
        response = self.client.post(self.list_url, self.create_payload(name='ลูกไก่ตัวที่ 3'))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'CHICK_COUNT_EXCEEDS_HATCHED')

    # --- Date Validation ---

    def test_birth_date_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(birth_date=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BIRTH_DATE_IN_FUTURE')

    def test_birth_date_before_hatching_started_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url, self.create_payload(birth_date=(TODAY - timedelta(days=1)).isoformat()),
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BIRTH_DATE_BEFORE_HATCHING_STARTED')

    # --- Ownership (User -> Booking -> Hatching -> Chick relationship chain) ---

    def test_customer_can_read_own_chick(self):
        services.create_chick(hatching_id=self.hatching.id, birth_date=TODAY)
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_stranger_cannot_read_others_chick(self):
        chick = services.create_chick(hatching_id=self.hatching.id, birth_date=TODAY)
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(chick.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_chicks(self):
        services.create_chick(hatching_id=self.hatching.id, birth_date=TODAY)
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)
