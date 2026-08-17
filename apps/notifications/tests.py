"""
<<<<<<< HEAD
STEP17 — notification inbox (ownership scoping) + LINE account linking
(link-code issuance, webhook signature verification, webhook linking flow).
=======
STEP9 — LINE notification coverage: delivery failure isolation, retry, and
webhook signature security / account-linking.
>>>>>>> origin/main
"""

import base64
import hashlib
import hmac
import json
<<<<<<< HEAD

=======
from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
>>>>>>> origin/main
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
<<<<<<< HEAD
from apps.notifications.models import LineLinkCode, Notification

_TEST_CHANNEL_SECRET = 'test-line-channel-secret'


def sign(body: bytes, secret: str = _TEST_CHANNEL_SECRET) -> str:
    return base64.b64encode(hmac.new(secret.encode('utf-8'), body, hashlib.sha256).digest()).decode('utf-8')


class NotificationInboxTests(APITestCase):
    def setUp(self):
        self.list_url = reverse('notifications:notification-list')
        self.admin = User.objects.create_user(username='notif_admin', password='x', role=User.Role.ADMIN)
        self.owner = User.objects.create_user(username='notif_owner', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='notif_stranger', password='x', role=User.Role.CUSTOMER)
        self.own_notification = Notification.objects.create(
            user=self.owner, notif_type='BOOKING_APPROVED', message='การจองของคุณได้รับการอนุมัติแล้ว',
            status=Notification.Status.SENT,
        )
        Notification.objects.create(
            user=self.stranger, notif_type='BOOKING_APPROVED', message='ของคนอื่น',
        )

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_sees_only_own_notifications(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        messages = [item['message'] for item in response.data['results']]
        self.assertIn('การจองของคุณได้รับการอนุมัติแล้ว', messages)
        self.assertNotIn('ของคนอื่น', messages)

    def test_admin_sees_all_notifications(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        messages = [item['message'] for item in response.data['results']]
        self.assertIn('การจองของคุณได้รับการอนุมัติแล้ว', messages)
        self.assertIn('ของคนอื่น', messages)

    def test_stranger_cannot_retrieve_someone_elses_notification(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.get(reverse('notifications:notification-detail', args=[self.own_notification.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_no_write_endpoints_exposed(self):
        # NotificationPermission only allows SAFE_METHODS, so a write is denied at the
        # permission layer (403) before DRF would even get a chance to 405 on a missing
        # create() — either way, nothing writes a Notification through this endpoint.
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.list_url, {'message': 'x', 'notif_type': 'X'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class LineLinkCodeTests(APITestCase):
    def setUp(self):
        self.url = reverse('notifications:line-link-code')
        self.user = User.objects.create_user(username='link_user', password='x', role=User.Role.CUSTOMER)

    def test_requires_authentication(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_generates_six_digit_code_with_expiry(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['code']), 6)
        self.assertTrue(response.data['code'].isdigit())
        self.assertIn('expires_at', response.data)

    def test_requesting_again_invalidates_previous_code(self):
        self.client.force_authenticate(self.user)
        first = self.client.post(self.url).data['code']
        second = self.client.post(self.url).data['code']
        self.assertEqual(LineLinkCode.objects.filter(user=self.user, used_at__isnull=True).count(), 1)
        active_code = LineLinkCode.objects.get(user=self.user, used_at__isnull=True).code
        self.assertEqual(active_code, second)
        if first != second:
            self.assertFalse(LineLinkCode.objects.filter(user=self.user, code=first, used_at__isnull=True).exists())


@override_settings(LINE_CHANNEL_SECRET=_TEST_CHANNEL_SECRET)
class LineWebhookTests(APITestCase):
    def setUp(self):
        self.url = reverse('notifications:line-webhook')
        self.user = User.objects.create_user(username='webhook_user', password='x', role=User.Role.CUSTOMER)
        self.link_code = LineLinkCode.objects.create(
            user=self.user, code='123456', expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

    def _post_webhook(self, body: dict, signature: str | None = None):
        raw = json.dumps(body).encode('utf-8')
        headers = {'HTTP_X_LINE_SIGNATURE': signature if signature is not None else sign(raw)}
        return self.client.generic('POST', self.url, data=raw, content_type='application/json', **headers)

    def test_missing_signature_rejected(self):
        response = self._post_webhook({'events': []}, signature='')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_signature_rejected(self):
        response = self._post_webhook({'events': []}, signature='not-a-valid-signature')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valid_signature_with_matching_code_links_account(self):
        event = {
            'type': 'message',
            'message': {'type': 'text', 'text': '123456'},
            'source': {'type': 'user', 'userId': 'U_test_line_user_id'},
        }
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertEqual(self.user.line_user_id, 'U_test_line_user_id')
        self.link_code.refresh_from_db()
        self.assertIsNotNone(self.link_code.used_at)

    def test_valid_signature_but_unknown_code_is_noop(self):
        event = {
            'type': 'message',
            'message': {'type': 'text', 'text': '000000'},
            'source': {'type': 'user', 'userId': 'U_test_line_user_id'},
        }
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertIsNone(self.user.line_user_id)

    def test_expired_code_is_noop(self):
        self.link_code.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        self.link_code.save(update_fields=['expires_at'])

        event = {
            'type': 'message',
            'message': {'type': 'text', 'text': '123456'},
            'source': {'type': 'user', 'userId': 'U_test_line_user_id'},
        }
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertIsNone(self.user.line_user_id)

    def test_already_used_code_is_noop(self):
        self.link_code.used_at = timezone.now()
        self.link_code.save(update_fields=['used_at'])

        event = {
            'type': 'message',
            'message': {'type': 'text', 'text': '123456'},
            'source': {'type': 'user', 'userId': 'U_test_line_user_id'},
        }
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertIsNone(self.user.line_user_id)

    def test_non_text_event_ignored(self):
        event = {'type': 'follow', 'source': {'type': 'user', 'userId': 'U_test_line_user_id'}}
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

    def test_line_user_id_already_linked_to_another_account_does_not_steal_link(self):
        other_user = User.objects.create_user(
            username='already_linked', password='x', role=User.Role.CUSTOMER, line_user_id='U_already_linked',
        )
        event = {
            'type': 'message',
            'message': {'type': 'text', 'text': '123456'},
            'source': {'type': 'user', 'userId': 'U_already_linked'},
        }
        response = self._post_webhook({'events': [event]})
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        other_user.refresh_from_db()
        self.assertIsNone(self.user.line_user_id)
        self.assertEqual(other_user.line_user_id, 'U_already_linked')

    def test_unconfigured_channel_secret_always_rejects(self):
        with override_settings(LINE_CHANNEL_SECRET=''):
            response = self._post_webhook({'events': []})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
=======
from apps.bookings import services as booking_services
from apps.bookings.models import Booking
from apps.breeders.models import Breeder
from apps.core.exceptions import AppError
from apps.hens.models import Hen
from apps.payments import services as payment_services
from apps.payments.models import Payment

from apps.notifications import services
from apps.notifications.models import Notification

FUTURE_DATE = date.today() + timedelta(days=30)


def error_code(response):
    return response.data['error']['code']


def line_signature(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).digest()
    return base64.b64encode(digest).decode('utf-8')


class NotificationTestBase:
    def setUp(self):
        self.admin = User.objects.create_user(username='nt_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(
            username='nt_customer', password='x', role=User.Role.CUSTOMER, line_user_id='Ucustomerline',
        )
        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์แจ้งเตือน', service_rate=Decimal('1000.00'), default_monthly_quota=5,
            status=Breeder.Status.ACTIVE, created_by=self.admin,
        )
        self.hen = Hen.objects.create(owner=self.customer, name='แม่ไก่แจ้งเตือน', status=Hen.Status.ACTIVE)
        self.booking = booking_services.create_booking(
            customer=self.customer, hen=self.hen, breeder=self.breeder, booking_date=FUTURE_DATE,
        )
        self.booking.status = Booking.Status.PAID
        self.booking.paid_amount = self.booking.deposit_amount
        self.booking.save(update_fields=['status', 'paid_amount'])


@override_settings(LINE_CHANNEL_ACCESS_TOKEN='test-token')
class LineFailureTests(NotificationTestBase, APITestCase):
    """LINE Failure: a broken/unavailable LINE API must never break the
    triggering booking/payment operation, and must be recorded honestly."""

    def test_line_push_exception_marks_notification_failed_but_booking_approval_succeeds(self):
        import requests
        with patch('apps.notifications.services.requests.post', side_effect=requests.ConnectionError('boom')):
            with self.captureOnCommitCallbacks(execute=True):
                booking = booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        self.assertEqual(booking.status, Booking.Status.APPROVED)  # business operation still succeeded
        notification = Notification.objects.get(booking=booking, notif_type='BOOKING_APPROVED')
        self.assertEqual(notification.status, Notification.Status.FAILED)

    def test_line_push_non_2xx_marks_notification_failed(self):
        class FakeResponse:
            def raise_for_status(self):
                import requests
                raise requests.HTTPError('500 server error')

        with patch('apps.notifications.services.requests.post', return_value=FakeResponse()):
            with self.captureOnCommitCallbacks(execute=True):
                booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_APPROVED')
        self.assertEqual(notification.status, Notification.Status.FAILED)
        self.assertIn('500', notification.error_note)

    def test_line_push_success_marks_notification_sent(self):
        class FakeResponse:
            def raise_for_status(self):
                pass

        with patch('apps.notifications.services.requests.post', return_value=FakeResponse()) as mock_post:
            with self.captureOnCommitCallbacks(execute=True):
                booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        mock_post.assert_called_once()
        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_APPROVED')
        self.assertEqual(notification.status, Notification.Status.SENT)
        self.assertIsNotNone(notification.sent_at)

    def test_customer_without_line_user_id_fails_gracefully(self):
        self.customer.line_user_id = None
        self.customer.save(update_fields=['line_user_id'])

        with self.captureOnCommitCallbacks(execute=True):
            booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_APPROVED')
        self.assertEqual(notification.status, Notification.Status.FAILED)
        self.assertIn('line_user_id', notification.error_note)

    @override_settings(LINE_CHANNEL_ACCESS_TOKEN='')
    def test_missing_channel_token_fails_gracefully(self):
        with self.captureOnCommitCallbacks(execute=True):
            booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_APPROVED')
        self.assertEqual(notification.status, Notification.Status.FAILED)
        self.assertIn('LINE_CHANNEL_ACCESS_TOKEN', notification.error_note)

    def test_unexpected_notify_bug_never_breaks_booking_approval(self):
        """Even a completely broken notify_*() implementation must not turn a
        successful booking approval into a 500 (transaction.on_commit runs in
        the request/response cycle, after the DB commit)."""
        with patch('apps.notifications.services.create_and_send_notification', side_effect=RuntimeError('bug')):
            with self.captureOnCommitCallbacks(execute=True):
                booking = booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)

        self.assertEqual(booking.status, Booking.Status.APPROVED)
        self.assertFalse(Notification.objects.filter(booking=booking).exists())

    def test_booking_cancelled_notification(self):
        with self.captureOnCommitCallbacks(execute=True):
            booking_services.cancel_booking(booking_id=self.booking.id, actor=self.admin, reason='ทดสอบยกเลิก')

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_CANCELLED')
        self.assertIn('ทดสอบยกเลิก', notification.message)

    def test_payment_approved_notification(self):
        payment = self._make_pending_payment()
        with self.captureOnCommitCallbacks(execute=True):
            payment_services.approve_payment(payment_id=payment.id, admin=self.admin)

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='PAYMENT_APPROVED')
        self.assertIn(payment.payment_number, notification.message)

    def test_payment_rejected_notification(self):
        payment = self._make_pending_payment()
        with self.captureOnCommitCallbacks(execute=True):
            payment_services.reject_payment(payment_id=payment.id, admin=self.admin, remark='สลิปไม่ชัด')

        notification = Notification.objects.get(booking_id=self.booking.id, notif_type='PAYMENT_REJECTED')
        self.assertIn('สลิปไม่ชัด', notification.message)

    def _make_pending_payment(self):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        image = Image.new('RGB', (10, 10), color='blue')
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        slip = SimpleUploadedFile('slip.png', buffer.read(), content_type='image/png')
        return payment_services.create_payment(
            customer=self.customer, booking=self.booking, payment_type=Payment.PaymentType.DEPOSIT,
            amount=self.booking.deposit_amount, slip=slip, paid_at=timezone.now(),
        )


@override_settings(LINE_CHANNEL_ACCESS_TOKEN='test-token')
class NotificationRetryTests(NotificationTestBase, APITestCase):
    """Notification Retry: bounded, race-safe re-attempts of a FAILED notification."""

    def _failed_notification(self):
        import requests
        with patch('apps.notifications.services.requests.post', side_effect=requests.ConnectionError('boom')):
            with self.captureOnCommitCallbacks(execute=True):
                booking_services.approve_booking(booking_id=self.booking.id, admin=self.admin)
        return Notification.objects.get(booking_id=self.booking.id, notif_type='BOOKING_APPROVED')

    def test_retry_success_flips_to_sent_and_increments_retry_count(self):
        notification = self._failed_notification()

        class FakeResponse:
            def raise_for_status(self):
                pass

        with patch('apps.notifications.services.requests.post', return_value=FakeResponse()):
            retried = services.retry_notification(notification_id=notification.id, admin=self.admin)

        self.assertEqual(retried.status, Notification.Status.SENT)
        self.assertEqual(retried.retry_count, 1)

    def test_retry_already_sent_raises(self):
        notification = self._failed_notification()
        notification.status = Notification.Status.SENT
        notification.save(update_fields=['status'])

        with self.assertRaises(AppError) as ctx:
            services.retry_notification(notification_id=notification.id, admin=self.admin)
        self.assertEqual(ctx.exception.code, 'NOTIFICATION_ALREADY_SENT')

    def test_retry_limit_exceeded_raises(self):
        notification = self._failed_notification()
        notification.retry_count = services.MAX_RETRY_ATTEMPTS
        notification.save(update_fields=['retry_count'])

        with self.assertRaises(AppError) as ctx:
            services.retry_notification(notification_id=notification.id, admin=self.admin)
        self.assertEqual(ctx.exception.code, 'RETRY_LIMIT_EXCEEDED')

    def test_admin_can_retry_via_api(self):
        notification = self._failed_notification()
        self.client.force_authenticate(self.admin)
        url = reverse('notifications:notification-retry', args=[notification.id])

        import requests
        with patch('apps.notifications.services.requests.post', side_effect=requests.ConnectionError('still down')):
            response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertEqual(notification.retry_count, 1)

    def test_customer_cannot_retry_via_api(self):
        notification = self._failed_notification()
        self.client.force_authenticate(self.customer)
        url = reverse('notifications:notification-retry', args=[notification.id])

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_management_command_retries_failed_notifications(self):
        self._failed_notification()

        class FakeResponse:
            def raise_for_status(self):
                pass

        out = StringIO()
        with patch('apps.notifications.services.requests.post', return_value=FakeResponse()):
            call_command('retry_failed_notifications', stdout=out)

        self.assertIn('Retried 1 notification(s): 1 sent, 0 still failed.', out.getvalue())


@override_settings(LINE_CHANNEL_SECRET='test-webhook-secret')
class LineWebhookSecurityTests(NotificationTestBase, APITestCase):
    """Webhook Security: signature verification gates everything else, and the
    account-linking flow only ever links a code to the account that requested it."""

    def setUp(self):
        super().setUp()
        self.webhook_url = reverse('notifications:line-webhook')

    def _post_webhook(self, payload: dict, secret='test-webhook-secret', signature=None):
        body = json.dumps(payload).encode('utf-8')
        sig = signature if signature is not None else line_signature(secret, body)
        return self.client.post(self.webhook_url, data=body, content_type='application/json', HTTP_X_LINE_SIGNATURE=sig)

    def test_missing_signature_rejected(self):
        response = self.client.post(self.webhook_url, data=b'{"events": []}', content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), 'INVALID_SIGNATURE')

    def test_wrong_signature_rejected(self):
        response = self._post_webhook({'events': []}, signature='not-the-right-signature')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_signature_computed_with_wrong_secret_rejected(self):
        response = self._post_webhook({'events': []}, secret='someone-elses-secret')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_valid_signature_with_no_events_acks_200(self):
        response = self._post_webhook({'events': []})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_link_code_round_trip_sets_line_user_id(self):
        self.customer.line_user_id = None
        self.customer.line_link_code = None
        self.customer.save(update_fields=['line_user_id', 'line_link_code'])
        self.client.force_authenticate(self.customer)
        code_response = self.client.post(reverse('notifications:line-link-code'))
        self.assertEqual(code_response.status_code, status.HTTP_200_OK)
        code = code_response.data['code']

        payload = {'events': [{
            'type': 'message', 'message': {'type': 'text', 'text': code}, 'source': {'userId': 'Ubrandnewuser'},
        }]}
        response = self._post_webhook(payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.line_user_id, 'Ubrandnewuser')
        self.assertIsNone(self.customer.line_link_code)

    def test_expired_link_code_is_not_linked_but_still_acks_200(self):
        self.customer.line_user_id = None
        self.customer.line_link_code = '123456'
        self.customer.line_link_code_expires_at = timezone.now() - timedelta(minutes=1)
        self.customer.save(update_fields=['line_user_id', 'line_link_code', 'line_link_code_expires_at'])

        payload = {'events': [{
            'type': 'message', 'message': {'type': 'text', 'text': '123456'}, 'source': {'userId': 'Utoolate'},
        }]}
        response = self._post_webhook(payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertIsNone(self.customer.line_user_id)

    def test_unrecognized_code_ignored_but_still_acks_200(self):
        payload = {'events': [{
            'type': 'message', 'message': {'type': 'text', 'text': 'not-a-real-code'}, 'source': {'userId': 'Uwhoever'},
        }]}
        response = self._post_webhook(payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
>>>>>>> origin/main
