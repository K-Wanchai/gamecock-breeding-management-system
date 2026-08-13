from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


def error_fields(response):
    """Field-level validation errors live under error.details (standard_exception_handler envelope)."""
    return response.data['error']['details']


class RegistrationTests(APITestCase):
    def setUp(self):
        self.url = reverse('accounts:register')
        self.valid_payload = {
            'username': 'newcustomer',
            'email': 'newcustomer@example.com',
            'phone': '0812345678',
            'first_name': 'Somchai',
            'password': 'S0mchai!StrongPass',
            'password_confirm': 'S0mchai!StrongPass',
        }

    def test_register_success_creates_customer(self):
        response = self.client.post(self.url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username='newcustomer')
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertTrue(user.check_password('S0mchai!StrongPass'))
        self.assertNotEqual(user.password, 'S0mchai!StrongPass')  # hashed, never plain text
        self.assertNotIn('password', response.data)

    def test_register_ignores_client_supplied_role(self):
        payload = {**self.valid_payload, 'role': User.Role.ADMIN}
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username='newcustomer')
        self.assertEqual(user.role, User.Role.CUSTOMER)  # never trust client input for role (Global Rule #11)

    def test_register_duplicate_username_rejected(self):
        User.objects.create_user(username='newcustomer', password='Whatever!23Pass')
        response = self.client.post(self.url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', error_fields(response))

    def test_register_duplicate_email_rejected(self):
        User.objects.create_user(username='someoneelse', email='newcustomer@example.com', password='Whatever!23Pass')
        response = self.client.post(self.url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', error_fields(response))

    def test_register_invalid_email_rejected(self):
        payload = {**self.valid_payload, 'email': 'not-an-email'}
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', error_fields(response))

    def test_register_weak_password_rejected(self):
        payload = {**self.valid_payload, 'password': '123', 'password_confirm': '123'}
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', error_fields(response))
        self.assertFalse(User.objects.filter(username='newcustomer').exists())

    def test_register_password_mismatch_rejected(self):
        payload = {**self.valid_payload, 'password_confirm': 'SomethingElse!123'}
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
