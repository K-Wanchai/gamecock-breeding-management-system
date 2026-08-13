"""
Exercises IsOwnerOrAdmin through the real DRF request/permission pipeline
(APIRequestFactory + APIView), to prove the 401-vs-403 split required by
STEP3: no credentials -> 401, valid credentials but wrong owner -> 403.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from django.test import TestCase

from apps.accounts.models import User
from apps.core.permissions import IsOwnerOrAdmin
from apps.hens.models import Hen


class _HenDetailProbe(APIView):
    permission_classes = (IsOwnerOrAdmin,)

    def get(self, request, pk):
        hen = Hen.objects.get(pk=pk)
        self.check_object_permissions(request, hen)
        return Response({'id': hen.id})


class OwnershipHttpStatusTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(username='http_admin', password='x', role=User.Role.ADMIN)
        self.owner = User.objects.create_user(username='http_owner', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='http_stranger', password='x', role=User.Role.CUSTOMER)
        self.hen = Hen.objects.create(owner=self.owner, name='แม่ไก่ HTTP test')
        self.view = _HenDetailProbe.as_view()

    def test_no_credentials_returns_401(self):
        request = self.factory.get(f'/probe/{self.hen.id}/')
        response = self.view(request, pk=self.hen.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_non_owner_returns_403(self):
        request = self.factory.get(f'/probe/{self.hen.id}/')
        force_authenticate(request, user=self.stranger)
        response = self.view(request, pk=self.hen.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_owner_returns_200(self):
        request = self.factory.get(f'/probe/{self.hen.id}/')
        force_authenticate(request, user=self.owner)
        response = self.view(request, pk=self.hen.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_admin_returns_200(self):
        request = self.factory.get(f'/probe/{self.hen.id}/')
        force_authenticate(request, user=self.admin)
        response = self.view(request, pk=self.hen.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
