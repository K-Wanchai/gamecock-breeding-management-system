"""
STEP9 — Dashboard/Report permission, Search ownership, and query-count
(N+1 regression) coverage. Representative filter/pagination/ordering tests
are given for the Search endpoint and the Booking report; the same
FilterSet/BaseReportView pattern is shared identically by the other 6 reports
(see apps/reports/filters.py, apps/reports/views.py).
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding import services as breeding_services
from apps.hatching import services as hatching_services
from apps.chicks import services as chick_services
from apps.hens.models import Hen

TODAY = date.today()
FUTURE_DATE = TODAY + timedelta(days=30)


class ReportsTestBase:
    def setUp(self):
        self.admin = User.objects.create_user(username='rp_admin', password='x', role=User.Role.ADMIN)
        self.customer_a = User.objects.create_user(username='rp_customer_a', password='x', role=User.Role.CUSTOMER)
        self.customer_b = User.objects.create_user(username='rp_customer_b', password='x', role=User.Role.CUSTOMER)

        # Quota is generous (not the STEP5-realistic 5) because the performance/pagination
        # tests below intentionally create a dozen+ bookings for the same breeder/month to
        # build a dataset — the queue-capacity business rule is covered by apps.bookings.tests,
        # not by these report/search tests.
        self.breeder_a = Breeder.objects.create(
            name='พ่อพันธุ์เอ', service_rate=Decimal('1000.00'), default_monthly_quota=50,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.breeder_b = Breeder.objects.create(
            name='พ่อพันธุ์บี', service_rate=Decimal('2000.00'), default_monthly_quota=50,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )

        self.booking_a = self._make_booking(self.customer_a, self.breeder_a, 'แม่ไก่เอ')
        self.booking_b = self._make_booking(self.customer_b, self.breeder_b, 'แม่ไก่บี')

    def _make_booking(self, customer, breeder, hen_name, booking_date=FUTURE_DATE):
        hen = Hen.objects.create(owner=customer, name=hen_name, status=Hen.Status.ACTIVE)
        booking = booking_services.create_booking(customer=customer, hen=hen, breeder=breeder, booking_date=booking_date)
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=booking.id, admin=self.admin)
        booking.refresh_from_db()
        return booking

    def _build_full_chain(self, booking):
        """Advances `booking` through breeding -> egg -> hatching -> chick so the
        Breeding/Egg/Hatching/Chick reports have real rows to aggregate."""
        breeding_services.record_breeding_event(booking_id=booking.id, status='RECEIVED', event_date=TODAY, recorded_by=self.admin)
        egg = breeding_services.record_egg(booking_id=booking.id, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin)
        hatching = hatching_services.start_hatching(egg_id=egg.id, started_at=TODAY, recorded_by=self.admin)
        hatching = hatching_services.complete_hatching(
            hatching_id=hatching.id, completed_at=TODAY, hatched_count=4, survival_count=4, actor=self.admin,
        )
        chick = chick_services.create_chick(hatching_id=hatching.id, birth_date=TODAY)
        return egg, hatching, chick


REPORT_URL_NAMES = (
    'reports:report-bookings', 'reports:report-payments', 'reports:report-revenue', 'reports:report-breeding',
    'reports:report-eggs', 'reports:report-hatchings', 'reports:report-chicks',
)


class DashboardPermissionTests(ReportsTestBase, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse('reports:dashboard')

    def test_unauthenticated_rejected(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_sees_full_dashboard(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'ADMIN')
        self.assertEqual(response.data['bookings']['total'], Booking.objects.count())

    def test_customer_sees_only_own_scoped_dashboard(self):
        self.client.force_authenticate(self.customer_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'CUSTOMER')
        self.assertEqual(response.data['bookings']['total'], 1)  # only booking_a, not booking_b
        booking_numbers = [row['booking_number'] for row in response.data['recent_bookings']]
        self.assertIn(self.booking_a.booking_number, booking_numbers)
        self.assertNotIn(self.booking_b.booking_number, booking_numbers)


class ReportPermissionTests(ReportsTestBase, APITestCase):
    def test_customer_forbidden_on_every_report(self):
        self.client.force_authenticate(self.customer_a)
        for name in REPORT_URL_NAMES:
            response = self.client.get(reverse(name))
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, name)

    def test_unauthenticated_rejected_on_every_report(self):
        for name in REPORT_URL_NAMES:
            response = self.client.get(reverse(name))
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, name)

    def test_admin_allowed_on_every_report(self):
        self.client.force_authenticate(self.admin)
        for name in REPORT_URL_NAMES:
            response = self.client.get(reverse(name))
            self.assertEqual(response.status_code, status.HTTP_200_OK, name)
            self.assertIn('summary', response.data)
            self.assertIn('results', response.data)


class BookingReportFilterTests(ReportsTestBase, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse('reports:report-bookings')
        self.client.force_authenticate(self.admin)

    def test_filter_by_status(self):
        response = self.client.get(self.url, {'status': Booking.Status.APPROVED})
        self.assertEqual(response.data['summary']['total'], 2)  # both bookings are APPROVED

    def test_filter_by_breeder(self):
        response = self.client.get(self.url, {'breeder': self.breeder_a.id})
        self.assertEqual(response.data['summary']['total'], 1)
        self.assertEqual(response.data['results'][0]['booking_number'], self.booking_a.booking_number)

    def test_filter_by_customer(self):
        response = self.client.get(self.url, {'customer': self.customer_b.id})
        self.assertEqual(response.data['summary']['total'], 1)
        self.assertEqual(response.data['results'][0]['booking_number'], self.booking_b.booking_number)

    def test_date_range_excludes_out_of_range_bookings(self):
        response = self.client.get(self.url, {'date_from': '1900-01-01', 'date_to': '1900-01-02'})
        self.assertEqual(response.data['summary']['total'], 0)
        self.assertEqual(len(response.data['results']), 0)

    def test_date_range_includes_in_range_bookings(self):
        response = self.client.get(self.url, {'date_from': str(TODAY), 'date_to': str(FUTURE_DATE)})
        self.assertEqual(response.data['summary']['total'], 2)

    def test_ordering(self):
        response = self.client.get(self.url, {'ordering': 'booking_date'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_summary_total_price_matches_sum(self):
        response = self.client.get(self.url)
        expected = self.booking_a.price + self.booking_b.price
        self.assertEqual(Decimal(response.data['summary']['total_price']), expected)


class SearchOwnershipTests(ReportsTestBase, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse('reports:search')

    def test_customer_search_never_returns_another_customers_booking(self):
        self.client.force_authenticate(self.customer_a)
        # Even when explicitly searching by customer_b's own booking_number/hen/breeder.
        response = self.client.get(self.url, {'booking_number': self.booking_b.booking_number})
        self.assertEqual(response.data['count'], 0)

        response = self.client.get(self.url, {'search': self.booking_b.booking_number})
        self.assertEqual(response.data['count'], 0)

    def test_customer_search_finds_own_booking(self):
        self.client.force_authenticate(self.customer_a)
        response = self.client.get(self.url, {'booking_number': self.booking_a.booking_number})
        self.assertEqual(response.data['count'], 1)

    def test_admin_search_sees_all_customers(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url, {'search': ''})
        self.assertEqual(response.data['count'], 2)

    def test_search_by_hen_name(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url, {'hen': 'แม่ไก่เอ'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['booking_number'], self.booking_a.booking_number)

    def test_search_by_breeder_name(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url, {'breeder': 'พ่อพันธุ์บี'})
        self.assertEqual(response.data['count'], 1)

    def test_search_by_wing_clip_number(self):
        self.client.force_authenticate(self.admin)
        _, _, chick = self._build_full_chain(self.booking_a)
        response = self.client.get(self.url, {'wing_clip_number': chick.wing_clip_number})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['booking_number'], self.booking_a.booking_number)

    def test_pagination_splits_results_across_pages(self):
        """This project's global PageNumberPagination (PAGE_SIZE=20, config/settings.py)
        does not expose a client page_size override — so pagination is verified against
        that fixed page size, not a caller-supplied one."""
        self.client.force_authenticate(self.admin)
        for i in range(25):
            self._make_booking(self.customer_a, self.breeder_a, f'แม่ไก่เพิ่ม{i}', booking_date=FUTURE_DATE + timedelta(days=i))
        total = Booking.objects.count()  # booking_a + booking_b + 25 new ones

        page1 = self.client.get(self.url)
        self.assertEqual(page1.data['count'], total)
        self.assertEqual(len(page1.data['results']), 20)
        self.assertIsNotNone(page1.data['next'])
        self.assertIsNone(page1.data['previous'])

        page2 = self.client.get(self.url, {'page': 2})
        self.assertEqual(len(page2.data['results']), total - 20)
        self.assertIsNotNone(page2.data['previous'])

    def test_ordering_by_booking_date(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url, {'ordering': 'booking_date'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PerformanceQueryTests(ReportsTestBase, APITestCase):
    """Query count must not scale with the number of rows returned — proves the
    select_related/prefetch_related chains on Search/Report querysets actually
    prevent N+1 (Global Rule #41)."""

    def _query_count(self, url, params=None):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url, params or {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return len(ctx.captured_queries)

    def test_search_query_count_does_not_scale_with_row_count(self):
        self.client.force_authenticate(self.admin)
        url = reverse('reports:search')
        small_count = self._query_count(url)

        for i in range(8):
            self._make_booking(self.customer_a, self.breeder_a, f'แม่ไก่มาก{i}', booking_date=FUTURE_DATE + timedelta(days=i))
        large_count = self._query_count(url)

        self.assertEqual(small_count, large_count)

    def test_booking_report_query_count_does_not_scale_with_row_count(self):
        self.client.force_authenticate(self.admin)
        url = reverse('reports:report-bookings')
        small_count = self._query_count(url)

        for i in range(8):
            self._make_booking(self.customer_b, self.breeder_b, f'แม่ไก่มากบี{i}', booking_date=FUTURE_DATE + timedelta(days=i))
        large_count = self._query_count(url)

        self.assertEqual(small_count, large_count)

    def test_dashboard_query_count_is_bounded(self):
        self.client.force_authenticate(self.admin)
        url = reverse('reports:dashboard')
        count = self._query_count(url)
        self.assertLess(count, 25)
