"""STEP7 — Vaccination coverage: permission, duplicate-dose and date validation tests."""

from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
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

from apps.vaccinations import services
from apps.vaccinations.models import Vaccination

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()


def error_code(response):
    return response.data['error']['code']


class VaccinationTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='vac_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='vac_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='vac_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์วัคซีน', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่วัคซีน', status=Hen.Status.ACTIVE)
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


class VaccinationCRUDTests(VaccinationTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('vaccinations:vaccination-list')

    def detail_url(self, pk):
        return reverse('vaccinations:vaccination-detail', args=[pk])

    def create_payload(self, **overrides):
        payload = {
            'chick': self.chick.id, 'vaccine_name': 'Newcastle Disease', 'vaccination_date': TODAY.isoformat(),
            'dose_number': 1,
        }
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Admin Access / Success (Vaccination) ---

    def test_admin_can_record_vaccination(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        vaccination = Vaccination.objects.get(pk=response.data['id'])
        self.assertEqual(vaccination.age_days, 0)  # vaccinated same day as birth_date

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_record_vaccination(self):
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
            services.record_vaccination(
                chick_id=999999, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    # --- Duplicate Data ---

    def test_duplicate_dose_rejected_at_api_level(self):
        self.client.force_authenticate(self.admin)
        first = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)  # unique-together validator

    def test_duplicate_dose_database_constraint(self):
        services.record_vaccination(
            chick_id=self.chick.id, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Vaccination.objects.create(
                    chick=self.chick, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
                )

    def test_different_dose_number_allowed(self):
        self.client.force_authenticate(self.admin)
        first = self.client.post(self.list_url, self.create_payload())
        second = self.client.post(self.list_url, self.create_payload(dose_number=2))
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)

    # --- Validation (dose number) ---

    def test_dose_number_below_one_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(dose_number=0))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Date Validation ---

    def test_vaccination_date_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(vaccination_date=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'VACCINATION_DATE_IN_FUTURE')

    def test_vaccination_date_before_birth_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url, self.create_payload(vaccination_date=(TODAY - timedelta(days=1)).isoformat()),
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'VACCINATION_DATE_BEFORE_BIRTH')

    def test_age_days_computed_correctly(self):
        # vaccination_date must not be in the future, so age the chick by backdating
        # its whole hatching/birth chain instead of the vaccination date.
        past_date = TODAY - timedelta(days=14)
        egg = breeding_services.record_egg(
            booking_id=self.booking.id, total_eggs=5, good_eggs=5, bad_eggs=0, egg_date=past_date,
            recorded_by=self.admin,
        )
        hatching = hatching_services.start_hatching(egg_id=egg.id, started_at=past_date, recorded_by=self.admin)
        hatching_services.complete_hatching(
            hatching_id=hatching.id, completed_at=past_date, hatched_count=1, actor=self.admin,
        )
        hatching.refresh_from_db()
        chick = chick_services.create_chick(hatching_id=hatching.id, birth_date=past_date)

        vaccination = services.record_vaccination(
            chick_id=chick.id, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
        )
        self.assertEqual(vaccination.age_days, 14)

    # --- Ownership ---

    def test_customer_can_read_own_vaccination(self):
        services.record_vaccination(
            chick_id=self.chick.id, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_stranger_cannot_read_others_vaccination(self):
        vaccination = services.record_vaccination(
            chick_id=self.chick.id, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(vaccination.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_vaccinations(self):
        services.record_vaccination(
            chick_id=self.chick.id, vaccine_name='ND', vaccination_date=TODAY, dose_number=1, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)
