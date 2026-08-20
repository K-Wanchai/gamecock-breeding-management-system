import type { BookingStatus } from '@/types/booking'

/** One row of GET /dashboard/'s recent_bookings (apps.reports.serializers.BookingReportSerializer). */
export interface DashboardRecentBooking {
  id: number
  booking_number: string
  customer: string
  hen: string
  breeder: string
  booking_date: string
  status: BookingStatus
  price: string
  paid_amount: string
  remaining_amount: string
  created_at: string
}

/**
 * GET /dashboard/ (apps.reports.services.get_dashboard_data) returns a
 * role-scoped shape — CUSTOMER only ever sees their own bookings/hens/chicks
 * scoping, ADMIN gets farm-wide figures. Every ADMIN-only key is optional
 * (absent for CUSTOMER), and `chicks`'s own shape differs by role (`total` for
 * CUSTOMER, `alive` for ADMIN) — read whichever field applies to the caller's
 * role and fall back to 0. `by_status` only contains statuses with at least
 * one row, so always fall back to 0 when reading a specific key.
 */
export interface DashboardSummary {
  role: 'ADMIN' | 'CUSTOMER'
  as_of: string
  bookings: {
    total: number
    /** ADMIN only. */
    this_month?: number
    by_status: Partial<Record<BookingStatus, number>>
  }
  payments: {
    pending_count: number
    /** ADMIN only. */
    pending_amount?: string
  }
  /** ADMIN only. */
  revenue?: {
    this_month: string
    this_year: string
  }
  /** ADMIN only. */
  breeders?: {
    active: number
  }
  /** ADMIN only. */
  breeding?: {
    in_progress: number
  }
  /** ADMIN only. */
  hatching?: {
    incubating: number
  }
  /** CUSTOMER only. */
  hens?: {
    total: number
    active: number
  }
  chicks?: {
    /** CUSTOMER only. */
    total?: number
    /** ADMIN only. */
    alive?: number
  }
  recent_bookings: DashboardRecentBooking[]
}
