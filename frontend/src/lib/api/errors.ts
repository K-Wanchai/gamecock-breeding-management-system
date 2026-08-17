import type { AxiosError } from 'axios'

/** Mirrors the backend's standard error envelope: {"error": {"code","message","details"}} */
export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiError extends Error {
  code: string
  details?: unknown
  status?: number

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'object'
  )
}

/** Normalizes any Axios failure into an ApiError so the UI never has to branch on shape. */
export function normalizeApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError

  if (!axiosError?.isAxiosError) {
    return new ApiError('UNKNOWN_ERROR', 'An unexpected error occurred.')
  }

  if (!axiosError.response) {
    return new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection.')
  }

  const { status, data } = axiosError.response

  if (isErrorEnvelope(data)) {
    return new ApiError(data.error.code, data.error.message, status, data.error.details)
  }

  return new ApiError('UNKNOWN_ERROR', axiosError.message || 'Request failed.', status)
}

/**
 * DRF serializer validation errors arrive as `details: {field: [msg, ...]}` — the
 * envelope's top-level `message` is just a generic "Request failed validation."
 * in that case, so callers that want to show the real reason need this instead.
 */
export function formatFieldErrors(details: unknown): string | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return undefined
  }

  const lines = Object.entries(details as Record<string, unknown>).flatMap(([field, messages]) => {
    const list = Array.isArray(messages) ? messages : [messages]
    return list.map((message) => `${field}: ${message}`)
  })

  return lines.length > 0 ? lines.join('\n') : undefined
}
