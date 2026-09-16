import { api } from '@/lib/api/client'
import type { Booking, BookingCreatePayload, BookingListParams, BookingTimeline } from '@/types/booking'
import type { PaginatedResponse } from '@/types/api'

export async function listBookings(params: BookingListParams): Promise<PaginatedResponse<Booking>> {
  const { data } = await api.get<PaginatedResponse<Booking>>('/bookings/', { params })
  return data
}

export async function getBooking(id: number): Promise<Booking> {
  const { data } = await api.get<Booking>(`/bookings/${id}/`)
  return data
}

/** price/deposit_amount are never sent by the client — the response is the server-computed snapshot. */
export async function createBooking(payload: BookingCreatePayload): Promise<Booking> {
  const { data } = await api.post<Booking>('/bookings/', payload)
  return data
}

export async function cancelBooking(id: number, reason?: string): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/cancel/`, { reason })
  return data
}

/** ADMIN only — requires the booking to be PAID; locks a queue slot (apps.bookings.services.approve_booking). */
export async function approveBooking(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/approve/`)
  return data
}

/** Customer-facing combined timeline: insemination records + eggs + breeding events in one request. */
export async function getBookingTimeline(id: number): Promise<BookingTimeline> {
  const { data } = await api.get<BookingTimeline>(`/bookings/${id}/timeline/`)
  return data
}

/** ADMIN only — marks the booking's hen as brooding, stopping further insemination/egg recording. */
export async function markHenBrooding(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/mark_brooding/`)
  return data
}

/** ADMIN only — signals health recording is done; booking moves from care page to wing-clip page. */
export async function markClipReady(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/mark_clip_ready/`)
  return data
}

function _triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadBatchCertificate(id: number, bookingNumber: string): Promise<void> {
  const response = await api.get(`/bookings/${id}/batch_certificate/`, { responseType: 'blob' })
  _triggerDownload(response.data as Blob, `cert-${bookingNumber}.pdf`)
}

export async function downloadDeliveryLabel(id: number, bookingNumber: string): Promise<void> {
  const response = await api.get(`/bookings/${id}/delivery_label/`, { responseType: 'blob' })
  _triggerDownload(response.data as Blob, `label-${bookingNumber}.pdf`)
}

/** ADMIN only — transitions IN_PROGRESS booking to COMPLETED after chick recording is done. */
export async function completeBooking(id: number): Promise<Booking> {
  const { data } = await api.patch<Booking>(`/bookings/${id}/complete/`)
  return data
}
