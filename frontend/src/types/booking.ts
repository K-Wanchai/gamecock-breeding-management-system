export type BookingStatus =
  | 'PENDING'
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'

/** Statuses a CUSTOMER may still self-cancel from — mirrors apps.bookings.services.cancel_booking. */
export const CUSTOMER_CANCELLABLE_STATUSES: BookingStatus[] = ['PENDING', 'WAITING_PAYMENT', 'PAID']

export interface BookingHenSummary {
  id: number
  name: string
  breed: string | null
}

export interface BookingBreederSummary {
  id: number
  name: string
  breed: string | null
  service_rate: string
}

export interface BookingCustomerSummary {
  id: number
  username: string
}

/** Decimal fields (price, deposit_amount, paid_amount, remaining_amount) serialize as strings from DRF. */
export interface Booking {
  id: number
  booking_number: string
  customer: BookingCustomerSummary
  hen: BookingHenSummary
  breeder: BookingBreederSummary
  booking_date: string
  booking_year: number
  booking_month: number
  queue_no: number | null
  price: string
  deposit_amount: string
  paid_amount: string
  remaining_amount: string
  status: BookingStatus
  current_breeding_stage: string | null
  latest_breeding_status: string | null
  note: string | null
  requested_at: string
  approved_at: string | null
  locked_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export interface BookingCreatePayload {
  hen: number
  breeder: number
  booking_date: string
  note?: string
}

export interface BookingListParams {
  page?: number
  status?: BookingStatus | ''
  search?: string
  booking_date?: string
}

/* ─── Timeline (GET /api/v1/bookings/{id}/timeline/) ─── */

export interface BookingTimelineBreedingEvent {
  id: number
  status: string
  status_display: string
  event_date: string
  description: string | null
  created_at: string
}

export interface BookingTimelineEgg {
  id: number
  total_eggs: number
  good_eggs: number
  bad_eggs: number
  good_egg_rate: string
  egg_date: string
  incubation_date: string | null
  remark: string | null
  created_at: string
}

export interface BookingTimeline {
  id: number
  booking_number: string
  status: BookingStatus
  status_display: string
  hen: BookingHenSummary
  breeder: BookingBreederSummary
  booking_date: string
  queue_no: number | null
  current_breeding_stage: { status: string; status_display: string; event_date: string } | null
  breeding_events: BookingTimelineBreedingEvent[]
  eggs: BookingTimelineEgg[]
}
