import { toast } from 'sonner'
import { ApiError, formatFieldErrors, normalizeApiError } from '@/lib/api/errors'

/** Central place every screen calls on a failed mutation/query so error toasts look the same everywhere. */
export function toastApiError(error: unknown) {
  const apiError = error instanceof ApiError ? error : normalizeApiError(error)
  const description = formatFieldErrors(apiError.details) ?? apiError.code
  toast.error(apiError.message, { description })
}
