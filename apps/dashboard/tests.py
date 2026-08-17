"""STEP18 — customer dashboard summary aggregation."""

import datetime
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.hens.models import Hen


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        self.url = reverse('dashboard:summary')
        self.admin = User.objects.create_user(username='dash_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='dash_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='dash_stranger', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(name='พ่อพันธุ์ทดสอบ', service_rate=Decimal('1000'))
        self.stranger_hen = Hen.objects.create(owner=self.stranger, name='แม่ไก่คนอื่น')
        self._hen_counter = 0

    def _make_hen(self, owner):
        self._hen_counter += 1
        return Hen.objects.create(owner=owner, name=f'แม่ไก่ทดสอบ {self._hen_counter}')

    def _make_booking(self, *, owner, status_value, remaining_amount, booking_number, hen=None):
        # Booking.uq_booking_hen_active only allows one active-status booking per hen, and
        # uq_booking_no_duplicate_request blocks repeating (hen, breeder, year, month) outside
        # CANCELLED/REJECTED — a fresh hen per booking sidesteps both unless the caller wants
        # to deliberately reuse one (e.g. two terminal-status bookings, which don't collide).
        return Booking.objects.create(
            customer=owner, hen=hen or self._make_hen(owner), breeder=self.breeder,
            booking_date=datetime.date.today(), booking_year=2026, booking_month=8,
            price=Decimal('1000'), deposit_amount=Decimal('300'),
            paid_amount=Decimal('1000') - remaining_amount, remaining_amount=remaining_amount,
            status=status_value, booking_number=booking_number,
        )

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_cannot_use_customer_dashboard(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_booking_counts_by_status(self):
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.WAITING_PAYMENT,
            remaining_amount=Decimal('1000'), booking_number='BK-1',
        )
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.WAITING_PAYMENT,
            remaining_amount=Decimal('1000'), booking_number='BK-2',
        )
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.APPROVED,
            remaining_amount=Decimal('700'), booking_number='BK-3',
        )
        # Belongs to a different customer — must never appear in this customer's counts.
        self._make_booking(
            owner=self.stranger, hen=self.stranger_hen, status_value=Booking.Status.WAITING_PAYMENT,
            remaining_amount=Decimal('1000'), booking_number='BK-4',
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['booking_counts']['WAITING_PAYMENT'], 2)
        self.assertEqual(response.data['booking_counts']['APPROVED'], 1)
        self.assertEqual(response.data['booking_counts']['COMPLETED'], 0)

    def test_outstanding_total_excludes_cancelled_and_rejected(self):
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.WAITING_PAYMENT,
            remaining_amount=Decimal('700.00'), booking_number='BK-10',
        )
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.APPROVED,
            remaining_amount=Decimal('300.50'), booking_number='BK-11',
        )
        # Still has a nonzero remaining_amount but is CANCELLED — must not count toward the total.
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.CANCELLED,
            remaining_amount=Decimal('1000.00'), booking_number='BK-12',
        )
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.REJECTED,
            remaining_amount=Decimal('1000.00'), booking_number='BK-13',
        )
        # Fully paid — remaining_amount is 0, naturally excluded.
        self._make_booking(
            owner=self.customer, status_value=Booking.Status.COMPLETED,
            remaining_amount=Decimal('0.00'), booking_number='BK-14',
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get(self.url)
        self.assertEqual(response.data['outstanding_payment_total'], '1000.50')

    def test_outstanding_total_zero_when_no_bookings(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.url)
        self.assertEqual(response.data['outstanding_payment_total'], '0.00')
        self.assertEqual(response.data['chick_count'], 0)
