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

/** Customer-facing combined timeline: breeding events + eggs in one request. */
export async function getBookingTimeline(id: number): Promise<BookingTimeline> {
  const { data } = await api.get<BookingTimeline>(`/bookings/${id}/timeline/`)
  return data
}
