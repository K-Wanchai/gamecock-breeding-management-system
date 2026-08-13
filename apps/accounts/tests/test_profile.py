from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class ProfileTests(APITestCase):
    def setUp(self):
        self.profile_url = reverse('accounts:profile')
        self.password = 'Passw0rd!123'
        self.user = User.objects.create_user(username='profileowner', password=self.password, role=User.Role.CUSTOMER)
        self.other = User.objects.create_user(username='someoneelse', email='taken@example.com', password=self.password)

        login = self.client.post(reverse('accounts:login'), {'username': 'profileowner', 'password': self.password}).data
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login["access"]}')

    def test_patch_profile_updates_own_fields(self):
        response = self.client.patch(self.profile_url, {'phone': '0899999999', 'first_name': 'Somsri'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, '0899999999')
        self.assertEqual(self.user.first_name, 'Somsri')

    def test_patch_profile_duplicate_email_rejected(self):
        response = self.client.patch(self.profile_url, {'email': 'taken@example.com'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_profile_cannot_change_role_or_username(self):
        response = self.client.patch(self.profile_url, {'role': User.Role.ADMIN, 'username': 'hijacked'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.CUSTOMER)
        self.assertEqual(self.user.username, 'profileowner')

    def test_profile_requires_authentication(self):
        self.client.credentials()
        response = self.client.patch(self.profile_url, {'phone': '0899999999'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
