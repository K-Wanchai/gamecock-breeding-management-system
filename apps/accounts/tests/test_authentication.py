from datetime import timedelta

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.login_url = reverse('accounts:login')
        self.refresh_url = reverse('accounts:refresh')
        self.logout_url = reverse('accounts:logout')
        self.me_url = reverse('accounts:me')

        self.password = 'C0rrectHorse!Battery'
        self.user = User.objects.create_user(
            username='rider', email='rider@example.com', password=self.password, role=User.Role.CUSTOMER,
        )

    def _login(self):
        return self.client.post(self.login_url, {'username': 'rider', 'password': self.password})

    # --- Login / JWT -----------------------------------------------------

    def test_login_success_returns_tokens_and_user(self):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'rider')

    def test_jwt_access_token_carries_role_claim(self):
        response = self._login()
        token = AccessToken(response.data['access'])
        self.assertEqual(token['role'], User.Role.CUSTOMER)
        self.assertEqual(token['username'], 'rider')

    def test_login_wrong_password_returns_401(self):
        response = self.client.post(self.login_url, {'username': 'rider', 'password': 'wrong-password'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user_returns_401(self):
        response = self.client.post(self.login_url, {'username': 'ghost', 'password': 'whatever123!'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_inactive_account_returns_401(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Refresh -----------------------------------------------------------

    def test_refresh_returns_new_access_token(self):
        refresh = self._login().data['refresh']
        response = self.client.post(self.refresh_url, {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_with_invalid_token_returns_401(self):
        response = self.client.post(self.refresh_url, {'refresh': 'not-a-real-token'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_cannot_be_reused_after_rotation(self):
        """ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION: reusing an old refresh token must fail."""
        refresh = self._login().data['refresh']
        first = self.client.post(self.refresh_url, {'refresh': refresh})
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        reused = self.client.post(self.refresh_url, {'refresh': refresh})
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Logout / revocation -------------------------------------------------

    def test_logout_requires_authentication(self):
        response = self.client.post(self.logout_url, {'refresh': 'irrelevant'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        tokens = self._login().data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')

        logout_response = self.client.post(self.logout_url, {'refresh': tokens['refresh']})
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        reuse_response = self.client.post(self.refresh_url, {'refresh': tokens['refresh']})
        self.assertEqual(reuse_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_field_returns_400(self):
        tokens = self._login().data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        response = self.client.post(self.logout_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- /me (401 vs unauthenticated) ----------------------------------------

    def test_me_requires_authentication_401(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user_when_authenticated(self):
        tokens = self._login().data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'rider')
        self.assertEqual(response.data['role'], User.Role.CUSTOMER)

    def test_expired_access_token_returns_401(self):
        expired = AccessToken.for_user(self.user)
        expired.set_exp(lifetime=timedelta(seconds=-1))  # already in the past
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_malformed_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not.a.jwt')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
