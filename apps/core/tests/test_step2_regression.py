"""
Regression coverage for STEP2 (schema/constraints) so STEP3 auth changes are
proven not to have broken it (Global Rule #32/#45).
"""

from datetime import date

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding.models import Egg
from apps.chicks.services import create_chick
from apps.hatching.models import Hatching
from apps.hens.models import Hen


class Step2RegressionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username='reg_admin', password='x', role=User.Role.ADMIN)
        cls.customer = User.objects.create_user(username='reg_customer', password='x', role=User.Role.CUSTOMER)
        cls.breeder = Breeder.objects.create(name='Regression Breeder', service_rate=1000, created_by=cls.admin)
        cls.hen = Hen.objects.create(owner=cls.customer, name='Regression Hen')

    def test_hen_cannot_have_two_active_bookings(self):
        Booking.objects.create(
            customer=self.customer, hen=self.hen, breeder=self.breeder,
            booking_number='BK-69-90101', booking_date=date(2026, 8, 1), booking_year=2026, booking_month=8,
            price=1000,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Booking.objects.create(
                    customer=self.customer, hen=self.hen, breeder=self.breeder,
                    booking_number='BK-69-90102', booking_date=date(2026, 9, 1), booking_year=2026, booking_month=9,
                    price=1000,
                )

    def test_wing_clip_numbers_are_unique_across_batches(self):
        booking = Booking.objects.create(
            customer=self.customer, hen=self.hen, breeder=self.breeder,
            booking_number='BK-69-90103', booking_date=date(2026, 8, 1), booking_year=2026, booking_month=8,
            price=1000,
        )
        egg = Egg.objects.create(booking=booking, lay_date=date.today(), egg_count=2, recorded_by=self.admin)
        hatching = Hatching.objects.create(
            egg=egg, hatched_count=2, status=Hatching.Status.HATCHED, recorded_by=self.admin,
        )

        chick_one = create_chick(hatching=hatching, hatch_date=date.today())
        chick_two = create_chick(hatching=hatching, hatch_date=date.today())

        self.assertNotEqual(chick_one.wing_clip_number, chick_two.wing_clip_number)
