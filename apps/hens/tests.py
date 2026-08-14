"""
STEP4 §PART B — CRUD + ownership/IDOR + upload coverage for Hen.
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
from apps.hens.models import Hen


def error_fields(response):
    return response.data['error']['details']


def make_test_image(name='photo.png', fmt='PNG'):
    image = Image.new('RGB', (10, 10), color='blue')
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    buffer.seek(0)
    content_type = 'image/png' if fmt == 'PNG' else 'image/jpeg'
    return SimpleUploadedFile(name, buffer.read(), content_type=content_type)


_MEDIA_ROOT = tempfile.mkdtemp(prefix='hens_test_media_')


@override_settings(MEDIA_ROOT=_MEDIA_ROOT)
class HenCRUDTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.list_url = reverse('hens:hen-list')
        self.admin = User.objects.create_user(username='hen_admin', password='x', role=User.Role.ADMIN)
        self.owner = User.objects.create_user(username='hen_owner', password='x', role=User.Role.CUSTOMER)
        self.stranger = User.objects.create_user(username='hen_stranger', password='x', role=User.Role.CUSTOMER)
        self.hen = Hen.objects.create(
            owner=self.owner, name='แม่ไก่ดำ', breed='ประดู่หางดำ', bloodline='สายพม่า', age_months=14,
        )

    def detail_url(self, pk):
        return reverse('hens:hen-detail', args=[pk])

    # --- Authentication ---

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Ownership scoping on list ---

    def test_owner_sees_only_own_hens(self):
        Hen.objects.create(owner=self.stranger, name='แม่ไก่ของคนอื่น')
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data['results']]
        self.assertIn('แม่ไก่ดำ', names)
        self.assertNotIn('แม่ไก่ของคนอื่น', names)

    def test_admin_sees_all_hens(self):
        Hen.objects.create(owner=self.stranger, name='แม่ไก่ของคนอื่น')
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.list_url)
        names = [item['name'] for item in response.data['results']]
        self.assertIn('แม่ไก่ดำ', names)
        self.assertIn('แม่ไก่ของคนอื่น', names)

    # --- Create: owner forced from authenticated user ---

    def test_customer_can_create_own_hen(self):
        self.client.force_authenticate(self.owner)
        payload = {'name': 'แม่ไก่ใหม่', 'breed': 'เขียวเลา', 'bloodline': 'ไทยแท้', 'age_months': 8}
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = Hen.objects.get(name='แม่ไก่ใหม่')
        self.assertEqual(created.owner, self.owner)

    def test_create_ignores_client_supplied_owner(self):
        self.client.force_authenticate(self.owner)
        payload = {'name': 'ปลอมเจ้าของ', 'owner': self.stranger.id}
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        created = Hen.objects.get(name='ปลอมเจ้าของ')
        self.assertEqual(created.owner, self.owner)  # never trust client input (Global Rule #11)

    def test_create_missing_required_field_rejected(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.list_url, {'breed': 'ไม่มีชื่อ'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', error_fields(response))

    # --- Retrieve: object-level IDOR protection ---

    def test_owner_can_retrieve_own_hen(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.detail_url(self.hen.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stranger_cannot_retrieve_others_hen(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.get(self.detail_url(self.hen.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)  # excluded from scoped queryset

    def test_admin_can_retrieve_any_hen(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.detail_url(self.hen.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Update: IDOR protection ---

    def test_owner_can_update_own_hen(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.detail_url(self.hen.id), {'age_months': 15})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.hen.refresh_from_db()
        self.assertEqual(self.hen.age_months, 15)

    def test_stranger_cannot_update_others_hen(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.patch(self.detail_url(self.hen.id), {'name': 'แก้ไม่ได้'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.hen.refresh_from_db()
        self.assertNotEqual(self.hen.name, 'แก้ไม่ได้')

    def test_admin_can_update_any_hen(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.detail_url(self.hen.id), {'status': Hen.Status.INACTIVE})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    # --- Delete: IDOR protection ---

    def test_stranger_cannot_delete_others_hen(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.delete(self.detail_url(self.hen.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Hen.objects.filter(pk=self.hen.id).exists())

    def test_owner_can_delete_own_hen(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self.detail_url(self.hen.id))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Hen.objects.filter(pk=self.hen.id).exists())

    # --- Validation ---

    def test_negative_age_rejected(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.list_url, {'name': 'อายุติดลบ', 'age_months': -1})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Search / Filter / Pagination ---

    def test_search_by_breed(self):
        Hen.objects.create(owner=self.owner, name='แม่ไก่เขียว', breed='เขียวเลาหางขาว')
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url, {'search': 'เขียวเลา'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data['results']]
        self.assertIn('แม่ไก่เขียว', names)
        self.assertNotIn('แม่ไก่ดำ', names)

    def test_filter_by_status(self):
        Hen.objects.create(owner=self.owner, name='ปลดระวาง', status=Hen.Status.INACTIVE)
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url, {'status': Hen.Status.INACTIVE})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statuses = {item['status'] for item in response.data['results']}
        self.assertEqual(statuses, {Hen.Status.INACTIVE})

    def test_pagination_is_active(self):
        for i in range(25):
            Hen.objects.create(owner=self.owner, name=f'แม่ไก่เพจ {i}')
        self.client.force_authenticate(self.owner)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)  # PAGE_SIZE
        self.assertIsNotNone(response.data['next'])

    # --- Image upload (Pillow validation) ---

    def test_owner_can_upload_valid_image(self):
        self.client.force_authenticate(self.owner)
        image = make_test_image()
        response = self.client.patch(self.detail_url(self.hen.id), {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.hen.refresh_from_db()
        self.assertTrue(self.hen.image)

    def test_upload_rejects_non_image_file(self):
        self.client.force_authenticate(self.owner)
        bogus = SimpleUploadedFile('notes.txt', b'this is not an image', content_type='text/plain')
        response = self.client.patch(self.detail_url(self.hen.id), {'image': bogus}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('image', error_fields(response))

    def test_stranger_cannot_upload_image_to_others_hen(self):
        self.client.force_authenticate(self.stranger)
        image = make_test_image()
        response = self.client.patch(self.detail_url(self.hen.id), {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
