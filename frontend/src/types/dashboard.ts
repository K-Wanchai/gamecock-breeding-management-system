import type { BookingStatus } from '@/types/booking'

/** outstanding_payment_total serializes as a string (DRF DecimalField). */
export interface DashboardSummary {
  booking_counts: Record<BookingStatus, number>
  chick_count: number
  outstanding_payment_total: string
}
