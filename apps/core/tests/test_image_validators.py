"""
Direct unit coverage of apps.core.validators.validate_image_file (Global Rule #28:
File Upload must check MIME type, extension, and size) — exercised standalone so
the extension/content-type/size branches are proven without needing a full HTTP
round trip through Breeder/Hen (see apps.breeders.tests / apps.hens.tests for that).
"""

import io

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image

from apps.core.validators import MAX_IMAGE_SIZE_BYTES, validate_image_file


def _real_png(name='ok.png'):
    image = Image.new('RGB', (5, 5), color='green')
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class ValidateImageFileTests(SimpleTestCase):
    def test_valid_image_passes(self):
        validate_image_file(_real_png())  # must not raise

    def test_disallowed_extension_rejected(self):
        upload = SimpleUploadedFile('ok.bmp', b'not-checked-before-extension', content_type='image/bmp')
        with self.assertRaises(ValidationError):
            validate_image_file(upload)

    def test_disallowed_content_type_rejected(self):
        image = Image.new('RGB', (5, 5), color='blue')
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        upload = SimpleUploadedFile('ok.png', buffer.getvalue(), content_type='application/octet-stream')
        with self.assertRaises(ValidationError):
            validate_image_file(upload)

    def test_oversized_file_rejected_before_opening(self):
        upload = SimpleUploadedFile('big.jpg', b'x', content_type='image/jpeg')
        upload.size = MAX_IMAGE_SIZE_BYTES + 1  # bypass building an actual multi-MB fixture
        with self.assertRaises(ValidationError):
            validate_image_file(upload)

    def test_corrupt_image_content_rejected(self):
        upload = SimpleUploadedFile('corrupt.png', b'\x89PNG\r\n\x1a\nnot really a png', content_type='image/png')
        with self.assertRaises(ValidationError):
            validate_image_file(upload)
