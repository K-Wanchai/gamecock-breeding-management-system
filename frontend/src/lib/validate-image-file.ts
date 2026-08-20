const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Client-side mirror of apps.core.validators.validate_image_file's extension/content-type
 * whitelist and 5MB cap — a fast, friendly check before the request round-trips to the
 * server, which still re-validates (and additionally decodes the file) and remains the
 * real source of truth.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'รองรับเฉพาะไฟล์ .jpg .jpeg .png .webp เท่านั้น'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'ขนาดไฟล์ต้องไม่เกิน 5MB'
  }
  return null
}
