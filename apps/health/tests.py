"""STEP7 — HealthRecord coverage: permission, weight validation and date validation tests."""

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
from apps.chicks import services as chick_services
from apps.core.exceptions import AppError
from apps.hatching import services as hatching_services
from apps.hens.models import Hen

from apps.health import services
from apps.health.models import HealthRecord

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()


def error_code(response):
    return response.data['error']['code']


class HealthTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='hlt_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='hlt_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='hlt_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์สุขภาพ', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่สุขภาพ', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.booking.status = Booking.Status.PAID
        self.booking.paid_amount = self.booking.deposit_amount
        self.booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)
        self.booking.refresh_from_db()

        egg = breeding_services.record_egg(
            booking_id=self.booking.id, total_eggs=5, good_eggs=5, bad_eggs=0, egg_date=TODAY, recorded_by=self.admin,
        )
        hatching = hatching_services.start_hatching(egg_id=egg.id, started_at=TODAY, recorded_by=self.admin)
        hatching_services.complete_hatching(
            hatching_id=hatching.id, completed_at=TODAY, hatched_count=2, actor=self.admin,
        )
        hatching.refresh_from_db()
        self.chick = chick_services.create_chick(hatching_id=hatching.id, birth_date=TODAY)


class HealthRecordCRUDTests(HealthTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('health:health-record-list')

    def detail_url(self, pk):
        return reverse('health:health-record-detail', args=[pk])

    def create_payload(self, **overrides):
        payload = {
            'chick': self.chick.id, 'record_date': TODAY.isoformat(), 'weight': '55.5',
            'symptom': '', 'observation': 'สุขภาพแข็งแรง', 'medicine': '',
        }
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Admin Access / Success (Health) ---

    def test_admin_can_record_health(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        record = HealthRecord.objects.get(pk=response.data['id'])
        self.assertEqual(record.weight, Decimal('55.5'))

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_record_health(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Invalid chick ---

    def test_invalid_chick_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(chick=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_chick_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.record_health(chick_id=999999, record_date=TODAY, recorded_by=self.admin)
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    # --- Weight Validation ---

    def test_negative_weight_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(weight='-1'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_weight_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.record_health(chick_id=self.chick.id, record_date=TODAY, weight=Decimal('-1'), recorded_by=self.admin)
        self.assertEqual(ctx.exception.code, 'INVALID_WEIGHT')

    # --- Date Validation ---

    def test_record_date_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(record_date=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'RECORD_DATE_IN_FUTURE')

    def test_record_date_before_birth_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url, self.create_payload(record_date=(TODAY - timedelta(days=1)).isoformat()),
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'RECORD_DATE_BEFORE_BIRTH')

    # --- Ownership ---

    def test_customer_can_read_own_health_record(self):
        services.record_health(chick_id=self.chick.id, record_date=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_stranger_cannot_read_others_health_record(self):
        record = services.record_health(chick_id=self.chick.id, record_date=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(record.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_health_records(self):
        services.record_health(chick_id=self.chick.id, record_date=TODAY, recorded_by=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)
