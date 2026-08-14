"""
STEP1 §12 Data Ownership Matrix, exercised against real model instances
(not mocks) so a broken get_owner_user_id() chain would actually fail here.
"""

from datetime import date
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.breeding.models import BreedingTimeline, Egg
from apps.chicks.models import Chick
from apps.core.permissions import IsAdminRole, IsOwnerOrAdmin
from apps.documents.models import Document
from apps.hatching.models import Hatching
from apps.health.models import HealthRecord
from apps.hens.models import Hen
from apps.notifications.models import Notification
from apps.payments.models import Payment
from apps.vaccinations.models import Vaccination


def _req(user):
    return SimpleNamespace(user=user)


class OwnershipChainTests(TestCase):
    """Customer A must reach every one of these; Customer B must be blocked from all of them."""

    @classmethod
    def setUpTestData(cls):
        cls.perm = IsOwnerOrAdmin()

        cls.admin = User.objects.create_user(username='admin1', password='x', role=User.Role.ADMIN)
        cls.customer_a = User.objects.create_user(username='customer_a', password='x', role=User.Role.CUSTOMER)
        cls.customer_b = User.objects.create_user(username='customer_b', password='x', role=User.Role.CUSTOMER)

        cls.breeder = Breeder.objects.create(name='พ่อพันธุ์ทดสอบ', service_rate=5000, created_by=cls.admin)
        cls.hen = Hen.objects.create(owner=cls.customer_a, name='แม่ไก่ A')
        cls.booking = Booking.objects.create(
            customer=cls.customer_a, hen=cls.hen, breeder=cls.breeder,
            booking_number='BK-69-90001', booking_date=date(2026, 8, 1), booking_year=2026, booking_month=8,
            price=5000,
        )
        cls.payment = Payment.objects.create(
            payment_number='PM-69-90001', booking=cls.booking, payment_type=Payment.PaymentType.DEPOSIT, amount=1000,
            slip='slips/x.jpg', paid_at=timezone.now(),
        )
        cls.timeline = BreedingTimeline.objects.create(
            booking=cls.booking, stage=BreedingTimeline.Stage.RECEIVED_AT_FARM,
            event_date=date.today(), recorded_by=cls.admin,
        )
        cls.egg = Egg.objects.create(booking=cls.booking, lay_date=date.today(), egg_count=5, recorded_by=cls.admin)
        cls.hatching = Hatching.objects.create(
            egg=cls.egg, hatched_count=3, status=Hatching.Status.HATCHED, recorded_by=cls.admin,
        )
        cls.chick = Chick.objects.create(hatching=cls.hatching, wing_clip_number='TEST-0001', hatch_date=date.today())
        cls.health_record = HealthRecord.objects.create(chick=cls.chick, record_date=date.today(), recorded_by=cls.admin)
        cls.vaccination = Vaccination.objects.create(
            chick=cls.chick, vaccine_name='ND', vaccine_date=date.today(), administered_by=cls.admin,
        )
        cls.contract_doc = Document.objects.create(
            document_type=Document.DocumentType.CONTRACT, document_no='C-0001', booking=cls.booking,
        )
        cls.pedigree_doc = Document.objects.create(
            document_type=Document.DocumentType.PEDIGREE_CERTIFICATE, document_no='P-0001', chick=cls.chick,
        )
        cls.notification = Notification.objects.create(user=cls.customer_a, notif_type='TEST', message='hi')

    def _assert_owner_only(self, obj):
        self.assertTrue(self.perm.has_object_permission(_req(self.customer_a), None, obj), f'{obj!r} should allow owner')
        self.assertFalse(self.perm.has_object_permission(_req(self.customer_b), None, obj), f'{obj!r} must block non-owner')
        self.assertTrue(self.perm.has_object_permission(_req(self.admin), None, obj), f'{obj!r} should always allow admin')

    def test_hen_ownership(self):
        self._assert_owner_only(self.hen)

    def test_booking_ownership(self):
        self._assert_owner_only(self.booking)

    def test_payment_ownership_via_booking(self):
        self._assert_owner_only(self.payment)

    def test_breeding_timeline_ownership_via_booking(self):
        self._assert_owner_only(self.timeline)

    def test_egg_ownership_via_booking(self):
        self._assert_owner_only(self.egg)

    def test_hatching_ownership_via_egg_booking(self):
        self._assert_owner_only(self.hatching)

    def test_chick_ownership_via_hatching_egg_booking(self):
        self._assert_owner_only(self.chick)

    def test_health_record_ownership_via_chick(self):
        self._assert_owner_only(self.health_record)

    def test_vaccination_ownership_via_chick(self):
        self._assert_owner_only(self.vaccination)

    def test_contract_document_ownership_via_booking(self):
        self._assert_owner_only(self.contract_doc)

    def test_pedigree_document_ownership_via_chick(self):
        self._assert_owner_only(self.pedigree_doc)

    def test_notification_ownership_direct(self):
        self._assert_owner_only(self.notification)

    def test_object_without_get_owner_user_id_raises(self):
        class Bare:
            pass

        with self.assertRaises(TypeError):
            self.perm.has_object_permission(_req(self.customer_a), None, Bare())


class IsAdminRoleTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin2', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='cust2', password='x', role=User.Role.CUSTOMER)
        self.perm = IsAdminRole()

    def test_admin_passes(self):
        self.assertTrue(self.perm.has_permission(_req(self.admin), None))

    def test_customer_blocked(self):
        self.assertFalse(self.perm.has_permission(_req(self.customer), None))

    def test_anonymous_blocked(self):
        anon = SimpleNamespace(is_authenticated=False)
        self.assertFalse(self.perm.has_permission(_req(anon), None))
