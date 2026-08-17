"""
STEP17 — notification inbox (ownership scoping) + LINE account linking
(link-code issuance, webhook signature verification, webhook linking flow).
"""

import base64
import hashlib
import hmac
import json

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
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
