"""
STEP10 — dedicated coverage for apps.core.services, the shared running-number
generator every business number (booking_number, payment_number,
document_number, wing_clip_number) is built from (STEP1 Business Rule #14).
Previously only exercised indirectly through apps/bookings, apps/chicks,
apps/documents tests; this file tests it directly, including the real-thread
concurrency guarantee its own docstring claims.
"""

import threading

from django.db import connection, transaction
from django.test import TransactionTestCase

from apps.core.models import RunningNumberCounter
from apps.core.services import (
    format_booking_number, format_delivery_number, format_document_no, format_payment_number,
    format_pedigree_number, format_wing_clip_number, next_running_number,
)


class NextRunningNumberTests(TransactionTestCase):
    def test_raises_outside_atomic_block(self):
        with self.assertRaises(AssertionError):
            next_running_number(RunningNumberCounter.CounterType.BOOKING_QUEUE, 2026)

    def test_sequential_allocation_increments(self):
        with transaction.atomic():
            first = next_running_number(RunningNumberCounter.CounterType.BOOKING_QUEUE, 2026)
        with transaction.atomic():
            second = next_running_number(RunningNumberCounter.CounterType.BOOKING_QUEUE, 2026)
        self.assertEqual(first, 1)
        self.assertEqual(second, 2)

    def test_isolated_per_counter_type(self):
        with transaction.atomic():
            booking_no = next_running_number(RunningNumberCounter.CounterType.BOOKING_QUEUE, 2026)
        with transaction.atomic():
            payment_no = next_running_number(RunningNumberCounter.CounterType.PAYMENT_NO, 2026)
        self.assertEqual(booking_no, 1)
        self.assertEqual(payment_no, 1)  # separate counter row, not shared with BOOKING_QUEUE

    def test_isolated_per_year(self):
        with transaction.atomic():
            year_2025 = next_running_number(RunningNumberCounter.CounterType.WING_CLIP, 2025)
        with transaction.atomic():
            year_2026 = next_running_number(RunningNumberCounter.CounterType.WING_CLIP, 2026)
        self.assertEqual(year_2025, 1)
        self.assertEqual(year_2026, 1)  # separate (counter_type, year) row

    def test_concurrent_calls_never_hand_out_the_same_number(self):
        """Real-thread race test (same pattern as apps.bookings.tests.
        ConcurrentBookingTests) — proves select_for_update() actually
        serializes concurrent allocations rather than merely happening not
        to collide under TestCase's single-connection transaction wrapper."""
        results = []
        barrier = threading.Barrier(5)

        def attempt():
            barrier.wait()
            with transaction.atomic():
                number = next_running_number(RunningNumberCounter.CounterType.WING_CLIP, 2026)
            results.append(number)
            connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(sorted(results), [1, 2, 3, 4, 5])  # no duplicates, no gaps


class FormatNumberTests(TransactionTestCase):
    def test_format_wing_clip_number(self):
        self.assertEqual(format_wing_clip_number(2026, 7), '69-0007')

    def test_format_document_no(self):
        self.assertEqual(format_document_no('BK', 2026, 42), 'BK-69-00042')

    def test_format_booking_number_uses_bk_prefix(self):
        self.assertEqual(format_booking_number(2026, 1), 'BK-69-00001')

    def test_format_payment_number_uses_pm_prefix(self):
        self.assertEqual(format_payment_number(2026, 1), 'PM-69-00001')

    def test_format_pedigree_number_uses_pd_prefix(self):
        self.assertEqual(format_pedigree_number(2026, 1), 'PD-69-00001')

    def test_format_delivery_number_uses_dl_prefix(self):
        self.assertEqual(format_delivery_number(2026, 1), 'DL-69-00001')
