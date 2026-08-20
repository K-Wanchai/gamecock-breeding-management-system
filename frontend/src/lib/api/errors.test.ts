import { describe, expect, it } from 'vitest'
import { ApiError, formatFieldErrors, normalizeApiError } from '@/lib/api/errors'

function makeAxiosError(overrides: Record<string, unknown>) {
  return { isAxiosError: true, message: 'Request failed', ...overrides }
}

describe('normalizeApiError', () => {
  it('returns UNKNOWN_ERROR for a non-axios error', () => {
    const result = normalizeApiError(new Error('plain error'))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('returns NETWORK_ERROR when the axios error has no response (request never reached the server)', () => {
    const result = normalizeApiError(makeAxiosError({ response: undefined }))
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toBe('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อของคุณ')
  })

  it('extracts code/message/details/status from the backend error envelope', () => {
    const result = normalizeApiError(
      makeAxiosError({
        response: {
          status: 422,
          data: { error: { code: 'INVALID_BREEDING_TRANSITION', message: 'Cannot skip a stage.', details: { status: ['bad'] } } },
        },
      }),
    )
    expect(result.code).toBe('INVALID_BREEDING_TRANSITION')
    expect(result.message).toBe('Cannot skip a stage.')
    expect(result.status).toBe(422)
    expect(result.details).toEqual({ status: ['bad'] })
  })

  it('falls back to UNKNOWN_ERROR when the response body does not match the error envelope shape', () => {
    const result = normalizeApiError(
      makeAxiosError({ response: { status: 500, data: 'Internal Server Error' } }),
    )
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.status).toBe(500)
  })
})

describe('formatFieldErrors', () => {
  it('returns undefined for null/non-object/array details', () => {
    expect(formatFieldErrors(undefined)).toBeUndefined()
    expect(formatFieldErrors(null)).toBeUndefined()
    expect(formatFieldErrors('a string')).toBeUndefined()
    expect(formatFieldErrors(['array', 'not', 'object'])).toBeUndefined()
  })

  it('joins a single field with a single message', () => {
    expect(formatFieldErrors({ amount: ['Must be positive.'] })).toBe('amount: Must be positive.')
  })

  it('joins multiple fields and multiple messages per field, one per line', () => {
    const result = formatFieldErrors({
      amount: ['Must be positive.', 'Too large.'],
      paid_at: ['This field is required.'],
    })
    expect(result).toBe('amount: Must be positive.\namount: Too large.\npaid_at: This field is required.')
  })

  it('handles a non-array message value per field', () => {
    expect(formatFieldErrors({ amount: 'Must be positive.' })).toBe('amount: Must be positive.')
  })

  it('returns undefined for an empty object', () => {
    expect(formatFieldErrors({})).toBeUndefined()
  })
})
