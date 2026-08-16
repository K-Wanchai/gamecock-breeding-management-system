"""
STEP6 — breeding-process timeline (BreedingEvent) + egg tracking (Egg) coverage:
permission, business-rule, validation and concurrency tests.
"""

import threading
from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, connection, transaction
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.core.exceptions import AppError
from apps.hens.models import Hen

from apps.breeding import services
from apps.breeding.models import BreedingEvent, Egg

FUTURE_DATE = date.today() + timedelta(days=30)
TODAY = date.today()


def error_fields(response):
    return response.data['error']['details']


def error_code(response):
    return response.data['error']['code']


class BreedingTestBase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='brd_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='brd_customer', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='brd_stranger', password='x', role=User.Role.CUSTOMER)

        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์ผสม', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่ผสม', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self._approve(self.booking)

    def _approve(self, booking):
        booking.status = Booking.Status.PAID
        booking.paid_amount = booking.deposit_amount
        booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=booking.id, admin=self.admin)
        booking.refresh_from_db()


class BreedingEventCRUDTests(BreedingTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('breeding:breeding-event-list')

    def detail_url(self, pk):
        return reverse('breeding:breeding-event-detail', args=[pk])

    def create_payload(self, **overrides):
        payload = {
            'booking': self.booking.id, 'status': BreedingEvent.Status.RECEIVED, 'event_date': TODAY.isoformat(),
            'description': 'รับแม่ไก่เข้าฟาร์มแล้ว',
        }
        payload.update(overrides)
        return payload

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Admin Access / Success ---

    def test_admin_can_record_first_breeding_event(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        event = BreedingEvent.objects.get(pk=response.data['id'])
        self.assertEqual(event.status, BreedingEvent.Status.RECEIVED)
        self.assertEqual(event.recorded_by, self.admin)

    def test_admin_can_progress_through_full_flow(self):
        self.client.force_authenticate(self.admin)
        flow = [
            BreedingEvent.Status.RECEIVED, BreedingEvent.Status.BREEDING, BreedingEvent.Status.BREEDING_COMPLETED,
            BreedingEvent.Status.WAITING_EGG, BreedingEvent.Status.EGG_LAID, BreedingEvent.Status.INCUBATION,
            BreedingEvent.Status.HATCHING,
        ]
        for new_status in flow:
            response = self.client.post(self.list_url, self.create_payload(status=new_status))
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(
            BreedingEvent.objects.filter(booking=self.booking).count(), len(flow),
        )

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_record_breeding_event(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Invalid Transition ---

    def test_invalid_transition_skipping_stage_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(status=BreedingEvent.Status.BREEDING))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'INVALID_BREEDING_TRANSITION')

    def test_invalid_transition_going_backwards_rejected(self):
        # Unit-level: replaying an already-used status also trips the model's
        # (booking, status) unique-together validator at the API layer (see
        # test_duplicate_event_database_constraint_blocks_same_status_twice) —
        # so the pure state-machine rule is exercised directly here instead.
        with self.assertRaises(AppError) as ctx:
            services.transition_breeding_status(
                current_status=BreedingEvent.Status.BREEDING, new_status=BreedingEvent.Status.RECEIVED,
            )
        self.assertEqual(ctx.exception.code, 'INVALID_BREEDING_TRANSITION')

    def test_transition_after_terminal_hatching_rejected(self):
        services.record_breeding_event(
            booking_id=self.booking.id, status=BreedingEvent.Status.RECEIVED, event_date=TODAY,
            recorded_by=self.admin,
        )
        for st in (
            BreedingEvent.Status.BREEDING, BreedingEvent.Status.BREEDING_COMPLETED, BreedingEvent.Status.WAITING_EGG,
            BreedingEvent.Status.EGG_LAID, BreedingEvent.Status.INCUBATION, BreedingEvent.Status.HATCHING,
        ):
            services.record_breeding_event(booking_id=self.booking.id, status=st, event_date=TODAY, recorded_by=self.admin)

        with self.assertRaises(AppError) as ctx:
            services.record_breeding_event(
                booking_id=self.booking.id, status=BreedingEvent.Status.HATCHING, event_date=TODAY,
                recorded_by=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'INVALID_BREEDING_TRANSITION')

    # --- Duplicate Event ---

    def test_duplicate_event_database_constraint_blocks_same_status_twice(self):
        BreedingEvent.objects.create(
            booking=self.booking, status=BreedingEvent.Status.RECEIVED, event_date=TODAY, recorded_by=self.admin,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                BreedingEvent.objects.create(
                    booking=self.booking, status=BreedingEvent.Status.RECEIVED, event_date=TODAY,
                    recorded_by=self.admin,
                )

    # --- Invalid Booking ---

    def test_invalid_booking_rejected_by_serializer(self):
        # PrimaryKeyRelatedField (same pattern as BookingCreateSerializer/PaymentCreateSerializer)
        # rejects a nonexistent booking id at the API layer before the service ever runs.
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(booking=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('booking', error_fields(response))

    def test_invalid_booking_rejected_by_service(self):
        # Defense-in-depth (Global Rule #17): the service itself also guards against
        # a missing booking for any caller that bypasses the serializer.
        with self.assertRaises(AppError) as ctx:
            services.record_breeding_event(
                booking_id=999999, status=BreedingEvent.Status.RECEIVED, event_date=TODAY, recorded_by=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    def test_booking_not_yet_approved_rejected(self):
        hen2 = Hen.objects.create(owner=self.customer, name='แม่ไก่สอง', status=Hen.Status.ACTIVE)
        pending_booking = booking_services.create_booking(
            customer=self.customer, hen=hen2, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(booking=pending_booking.id))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_NOT_APPROVED')

    def test_cancelled_booking_rejected(self):
        booking_services.cancel_booking(booking_id=self.booking.id, actor=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_CANCELLED')

    # --- Invalid Date ---

    def test_event_date_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(event_date=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'EVENT_DATE_IN_FUTURE')

    def test_event_date_before_previous_event_rejected(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.list_url, self.create_payload(status=BreedingEvent.Status.RECEIVED, event_date=TODAY.isoformat()))
        response = self.client.post(self.list_url, self.create_payload(
            status=BreedingEvent.Status.BREEDING, event_date=(TODAY - timedelta(days=1)).isoformat(),
        ))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'EVENT_DATE_BEFORE_PREVIOUS')

    # --- Customer Access (read own only) ---

    def test_customer_can_read_own_breeding_events(self):
        event = services.record_breeding_event(
            booking_id=self.booking.id, status=BreedingEvent.Status.RECEIVED, event_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.customer)
        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.data['count'], 1)
        detail_response = self.client.get(self.detail_url(event.id))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

    def test_customer_cannot_read_others_breeding_events(self):
        event = services.record_breeding_event(
            booking_id=self.booking.id, status=BreedingEvent.Status.RECEIVED, event_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(event.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_breeding_events(self):
        services.record_breeding_event(
            booking_id=self.booking.id, status=BreedingEvent.Status.RECEIVED, event_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)


class BreedingEventConcurrencyTests(TransactionTestCase):
    """
    Real concurrency coverage (Global Rule #19): two threads racing to record the
    same next breeding event for one booking must not both succeed. select_for_update()
    on the Booking row fully serializes the two attempts, so the loser observes the
    winner's already-committed event and is rejected as an invalid transition (not a
    raw DB race) — see test_duplicate_event_database_constraint_blocks_same_status_twice
    for the lower-level DB-constraint guarantee that backs this up regardless.
    """

    def setUp(self):
        self.admin = User.objects.create_user(username='brd_race_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='brd_race_customer', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์แข่งขัน', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่แข่งขันผสม', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.booking.status = Booking.Status.PAID
        self.booking.paid_amount = self.booking.deposit_amount
        self.booking.save(update_fields=['status', 'paid_amount'])
        booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

    def test_concurrent_first_event_only_one_succeeds(self):
        results = []
        barrier = threading.Barrier(2)

        def attempt():
            barrier.wait()
            try:
                event = services.record_breeding_event(
                    booking_id=self.booking.id, status=BreedingEvent.Status.RECEIVED, event_date=date.today(),
                    recorded_by=self.admin,
                )
                results.append(('ok', event.id))
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
        self.assertIn(failures[0][1], ('INVALID_BREEDING_TRANSITION', 'DUPLICATE_BREEDING_EVENT'))
        self.assertEqual(
            BreedingEvent.objects.filter(booking=self.booking, status=BreedingEvent.Status.RECEIVED).count(), 1,
        )


class EggCRUDTests(BreedingTestBase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse('breeding:egg-list')

    def detail_url(self, pk):
        return reverse('breeding:egg-detail', args=[pk])

    def create_payload(self, **overrides):
        payload = {
            'booking': self.booking.id, 'total_eggs': 10, 'good_eggs': 8, 'bad_eggs': 2,
            'egg_date': TODAY.isoformat(),
        }
        payload.update(overrides)
        return payload

    # --- Admin Access / Success ---

    def test_admin_can_record_egg(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        egg = Egg.objects.get(pk=response.data['id'])
        self.assertEqual(egg.total_eggs, 10)
        self.assertEqual(egg.good_eggs, 8)
        self.assertEqual(egg.bad_eggs, 2)
        self.assertEqual(response.data['good_egg_rate'], '80.00')

    # --- Customer Access (write forbidden) ---

    def test_customer_cannot_record_egg(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Invalid Egg Count ---

    def test_good_plus_bad_exceeds_total_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(total_eggs=5, good_eggs=4, bad_eggs=4))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_good_plus_bad_exceeds_total_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.record_egg(
                booking_id=self.booking.id, total_eggs=5, good_eggs=4, bad_eggs=4, egg_date=TODAY,
                recorded_by=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'INVALID_EGG_COUNT')

    def test_negative_egg_count_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(total_eggs=-1))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Invalid Date ---

    def test_egg_date_in_future_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(egg_date=FUTURE_DATE.isoformat()))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'EGG_DATE_IN_FUTURE')

    def test_incubation_date_before_egg_date_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(
            incubation_date=(TODAY - timedelta(days=1)).isoformat(),
        ))
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'INCUBATION_DATE_BEFORE_EGG_DATE')

    # --- Invalid Booking ---

    def test_invalid_booking_rejected_by_serializer(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload(booking=999999))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('booking', error_fields(response))

    def test_invalid_booking_rejected_by_service(self):
        with self.assertRaises(AppError) as ctx:
            services.record_egg(
                booking_id=999999, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
            )
        self.assertEqual(ctx.exception.code, 'NOT_FOUND')

    def test_cancelled_booking_rejected(self):
        booking_services.cancel_booking(booking_id=self.booking.id, actor=self.admin)
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, self.create_payload())
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(error_code(response), 'BOOKING_CANCELLED')

    # --- Customer Access (read own only) ---

    def test_customer_can_read_own_eggs(self):
        services.record_egg(
            booking_id=self.booking.id, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_customer_cannot_read_others_eggs(self):
        egg = services.record_egg(
            booking_id=self.booking.id, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(egg.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_sees_all_eggs(self):
        services.record_egg(
            booking_id=self.booking.id, total_eggs=10, good_eggs=8, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)


class CalculateGoodEggRateTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='rate_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='rate_customer', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(name='พ่อพันธุ์เรท', service_rate=1000, created_by=self.admin)
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่เรท')
        self.booking = Booking.objects.create(
            customer=self.customer, hen=self.hen, breeder=self.breeder,
            booking_number='BK-69-90201', booking_date=TODAY, booking_year=TODAY.year, booking_month=TODAY.month,
            price=1000,
        )

    def test_rate_computed_as_percentage(self):
        egg = Egg.objects.create(
            booking=self.booking, total_eggs=8, good_eggs=6, bad_eggs=2, egg_date=TODAY, recorded_by=self.admin,
        )
        self.assertEqual(services.calculate_good_egg_rate(egg), Decimal('75.00'))

    def test_rate_zero_when_no_eggs(self):
        egg = Egg.objects.create(
            booking=self.booking, total_eggs=0, good_eggs=0, bad_eggs=0, egg_date=TODAY, recorded_by=self.admin,
        )
        self.assertEqual(services.calculate_good_egg_rate(egg), Decimal('0.00'))
