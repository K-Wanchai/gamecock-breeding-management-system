"""
STEP4 §PART A — CRUD + permission + upload coverage for Breeder.
"""

import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.breeders.models import Breeder


def error_fields(response):
    return response.data['error']['details']


def make_test_image(name='photo.png', fmt='PNG'):
    image = Image.new('RGB', (10, 10), color='red')
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    buffer.seek(0)
    content_type = 'image/png' if fmt == 'PNG' else 'image/jpeg'
    return SimpleUploadedFile(name, buffer.read(), content_type=content_type)


_MEDIA_ROOT = tempfile.mkdtemp(prefix='breeders_test_media_')


@override_settings(MEDIA_ROOT=_MEDIA_ROOT)
class BreederCRUDTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.list_url = reverse('breeders:breeder-list')
        self.admin = User.objects.create_user(username='breeder_admin', password='x', role=User.Role.ADMIN)
        self.customer = User.objects.create_user(username='breeder_customer', password='x', role=User.Role.CUSTOMER)
        self.breeder = Breeder.objects.create(
            name='พ่อพันธุ์ทอง', breed='อู่ทอง', bloodline='สายเวียดนาม', service_rate=3000,
            default_monthly_quota=5, created_by=self.admin,
        )

    def detail_url(self, pk):
        return reverse('breeders:breeder-detail', args=[pk])

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Read: both roles ---

    def test_customer_can_list(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)  # pagination envelope

    def test_customer_can_retrieve(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.detail_url(self.breeder.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'พ่อพันธุ์ทอง')

    def test_admin_can_list(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Write: ADMIN only ---

    def test_customer_cannot_create(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, {'name': 'ห้ามสร้าง', 'service_rate': 1000})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Breeder.objects.filter(name='ห้ามสร้าง').exists())

    def test_admin_can_create(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'name': 'พ่อพันธุ์ใหม่', 'breed': 'เหลืองหางขาว', 'bloodline': 'ไทยแท้',
            'description': 'พ่อพันธุ์คุณภาพดี', 'service_rate': '4500.00',
            'default_monthly_quota': 3, 'status': Breeder.Status.ACTIVE,
            'service_start_date': '2026-09-01',
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = Breeder.objects.get(name='พ่อพันธุ์ใหม่')
        self.assertEqual(created.created_by, self.admin)
        self.assertEqual(str(created.service_rate), '4500.00')

    def test_create_ignores_client_supplied_created_by(self):
        self.client.force_authenticate(self.admin)
        payload = {'name': 'ทดสอบ created_by', 'service_rate': 1000, 'created_by': self.customer.id}
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = Breeder.objects.get(name='ทดสอบ created_by')
        self.assertEqual(created.created_by, self.admin)  # never trust client input (Global Rule #11)

    def test_admin_create_missing_required_field_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, {'breed': 'ไม่มีชื่อ'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', error_fields(response))

    def test_customer_cannot_update(self):
        self.client.force_authenticate(self.customer)
        response = self.client.patch(self.detail_url(self.breeder.id), {'name': 'แก้ไม่ได้'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.breeder.refresh_from_db()
        self.assertNotEqual(self.breeder.name, 'แก้ไม่ได้')

    def test_admin_can_update(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.detail_url(self.breeder.id), {'status': Breeder.Status.INACTIVE})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.breeder.refresh_from_db()
        self.assertEqual(self.breeder.status, Breeder.Status.INACTIVE)

    def test_customer_cannot_delete(self):
        self.client.force_authenticate(self.customer)
        response = self.client.delete(self.detail_url(self.breeder.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Breeder.objects.filter(pk=self.breeder.id).exists())

    def test_admin_can_delete(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(self.detail_url(self.breeder.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Breeder.objects.filter(pk=self.breeder.id).exists())

    # --- Validation ---

    def test_negative_service_rate_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.list_url, {'name': 'ราคาติดลบ', 'service_rate': '-100.00'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Search / Filter / Pagination ---

    def test_search_by_name(self):
        self.client.force_authenticate(self.customer)
        Breeder.objects.create(name='พ่อพันธุ์เขียว', service_rate=1000, created_by=self.admin)
        response = self.client.get(self.list_url, {'search': 'เขียว'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data['results']]
        self.assertIn('พ่อพันธุ์เขียว', names)
        self.assertNotIn('พ่อพันธุ์ทอง', names)

    def test_filter_by_status(self):
        self.client.force_authenticate(self.customer)
        Breeder.objects.create(
            name='ปลดระวางแล้ว', service_rate=1000, status=Breeder.Status.RETIRED, created_by=self.admin,
        )
        response = self.client.get(self.list_url, {'status': Breeder.Status.RETIRED})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = {item['status'] for item in response.data['results']}
        self.assertEqual(statuses, {Breeder.Status.RETIRED})

    def test_pagination_is_active(self):
        self.client.force_authenticate(self.customer)
        for i in range(25):
            Breeder.objects.create(name=f'เพจจิ้งเนต {i}', service_rate=1000, created_by=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)  # PAGE_SIZE
        self.assertIsNotNone(response.data['next'])

    # --- Image upload (Pillow validation) ---

    def test_admin_can_upload_valid_image(self):
        self.client.force_authenticate(self.admin)
        image = make_test_image()
        response = self.client.patch(self.detail_url(self.breeder.id), {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.breeder.refresh_from_db()
        self.assertTrue(self.breeder.image)

    def test_upload_rejects_non_image_file(self):
        self.client.force_authenticate(self.admin)
        bogus = SimpleUploadedFile('notes.txt', b'this is not an image', content_type='text/plain')
        response = self.client.patch(self.detail_url(self.breeder.id), {'image': bogus}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', error_fields(response))

    def test_upload_rejects_disallowed_extension(self):
        self.client.force_authenticate(self.admin)
        image = make_test_image(name='photo.gif', fmt='GIF')
        response = self.client.patch(self.detail_url(self.breeder.id), {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', error_fields(response))
