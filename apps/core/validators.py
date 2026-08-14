"""
Shared upload validators (Global Rule #28: File Upload must check MIME type,
extension, and size). Used by any ImageField the API exposes for upload
(Breeder.image, Hen.image, ...).

Pillow-based content verification (not just trusting the extension) happens
separately in DRF's own ImageField.to_internal_value() for any ImageField a
ModelSerializer generates — this validator adds the extension/content-type
whitelist and the size cap DRF doesn't enforce on its own, and also runs at
the model layer (Meta.validators) so Django admin / shell writes are covered too.
"""

import os

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_IMAGE_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image_file(file):
    ext = os.path.splitext(file.name or '')[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f'Unsupported file extension "{ext}". Allowed: {", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))}.'
        )

    content_type = getattr(file, 'content_type', None)
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError(f'Unsupported content type "{content_type}".')

    size = getattr(file, 'size', None)
    if size is not None and size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(f'Image file is too large ({size} bytes). Maximum is {MAX_IMAGE_SIZE_BYTES} bytes.')

    try:
        file.seek(0)
        with Image.open(file) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        raise ValidationError('Uploaded file is not a valid image.')
    finally:
        file.seek(0)
