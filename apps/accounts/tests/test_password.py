from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class ChangePasswordTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:login')
        self.refresh_url = reverse('accounts:refresh')
        self.change_password_url = reverse('accounts:change-password')
        self.old_password = 'OldPassw0rd!123'
        self.user = User.objects.create_user(username='changer', password=self.old_password)

        login = self.client.post(self.login_url, {'username': 'changer', 'password': self.old_password}).data
        self.access = login['access']
        self.refresh = login['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access}')

    def test_change_password_success(self):
        response = self.client.post(self.change_password_url, {
            'old_password': self.old_password,
            'new_password': 'NewPassw0rd!456',
            'new_password_confirm': 'NewPassw0rd!456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassw0rd!456'))
        self.assertFalse(self.user.check_password(self.old_password))

    def test_change_password_wrong_old_password_rejected(self):
        response = self.client.post(self.change_password_url, {
            'old_password': 'totally-wrong',
            'new_password': 'NewPassw0rd!456',
            'new_password_confirm': 'NewPassw0rd!456',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data['error']['details'])

    def test_change_password_weak_new_password_rejected(self):
        response = self.client.post(self.change_password_url, {
            'old_password': self.old_password,
            'new_password': '123',
            'new_password_confirm': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_confirm_mismatch_rejected(self):
        response = self.client.post(self.change_password_url, {
            'old_password': self.old_password,
            'new_password': 'NewPassw0rd!456',
            'new_password_confirm': 'Different!789',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_revokes_existing_refresh_tokens(self):
        response = self.client.post(self.change_password_url, {
            'old_password': self.old_password,
            'new_password': 'NewPassw0rd!456',
            'new_password_confirm': 'NewPassw0rd!456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        reuse = self.client.post(self.refresh_url, {'refresh': self.refresh})
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_requires_authentication(self):
        self.client.credentials()  # clear auth header
        response = self.client.post(self.change_password_url, {
            'old_password': self.old_password,
            'new_password': 'NewPassw0rd!456',
            'new_password_confirm': 'NewPassw0rd!456',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.request_url = reverse('accounts:password-reset-request')
        self.confirm_url = reverse('accounts:password-reset-confirm')
        self.login_url = reverse('accounts:login')
        self.refresh_url = reverse('accounts:refresh')
        self.user = User.objects.create_user(
            username='forgetful', email='forgetful@example.com', password='OldPassw0rd!123',
        )

    def test_request_unknown_email_still_returns_200(self):
        """Never reveal whether an email is registered."""
        response = self.client.post(self.request_url, {'email': 'nobody@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_known_email_sends_mail(self):
        response = self.client.post(self.request_url, {'email': 'forgetful@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('forgetful@example.com', mail.outbox[0].to)

    def test_confirm_with_valid_token_resets_password(self):
        login = self.client.post(self.login_url, {'username': 'forgetful', 'password': 'OldPassw0rd!123'}).data
        old_refresh = login['refresh']

        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(self.confirm_url, {'uid': uid, 'token': token, 'new_password': 'BrandNew!789'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNew!789'))

        # old sessions must not survive a password reset
        reuse = self.client.post(self.refresh_url, {'refresh': old_refresh})
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirm_with_invalid_token_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(self.confirm_url, {'uid': uid, 'token': 'garbage-token', 'new_password': 'BrandNew!789'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_with_invalid_uid_rejected(self):
        response = self.client.post(self.confirm_url, {'uid': 'not-base64', 'token': 'irrelevant', 'new_password': 'BrandNew!789'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
