import type { BookingStatus } from '@/types/booking'
import type { PaymentStatus, PaymentType } from '@/types/payment'
import type { BreedingEventStatus } from '@/types/breeding'
import type { HatchingStatus } from '@/types/hatching'
import type { ChickGender, ChickStatus } from '@/types/chick'

/**
 * Every report accepts date_from/date_to (on the report's natural date field), breeder/customer
 * (both plain FK ids — there is no admin "list customers" endpoint yet, so the customer filter
 * is a raw numeric id input rather than a name picker) via apps.reports.filters.*Filter.
 */
interface ReportBaseParams {
  page?: number
  date_from?: string
  date_to?: string
  breeder?: number
  customer?: number
  ordering?: string
}

// ---- Booking report ----

export interface BookingReportRow {
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

/** by_status only contains statuses with at least one matching row. */
export interface BookingReportSummary {
  total: number
  total_price: string
  by_status: Partial<Record<BookingStatus, number>>
}

export interface BookingReportParams extends ReportBaseParams {
  status?: BookingStatus | ''
}

// ---- Payment report (also the row/param shape Revenue reuses) ----

export interface PaymentReportRow {
  id: number
  payment_number: string
  booking_number: string
  customer: string
  breeder: string
  payment_type: PaymentType
  amount: string
  status: PaymentStatus
  paid_at: string
  verified_at: string | null
}

export interface PaymentReportSummary {
  total: number
  total_amount: string
  by_status: Partial<Record<PaymentStatus, number>>
}

export interface PaymentReportParams extends ReportBaseParams {
  status?: PaymentStatus | ''
  payment_type?: PaymentType | ''
}

// ---- Revenue report ----

export interface RevenueByMonth {
  month: string
  total: string
}

export interface RevenueByBreeder {
  breeder_name: string | null
  total: string
}

export interface RevenueReportSummary {
  total: number
  total_amount: string
  by_month: RevenueByMonth[]
  by_breeder: RevenueByBreeder[]
}

/** No `status` filter — the queryset is already fixed to APPROVED payments by the view. */
export type RevenueReportParams = ReportBaseParams

// ---- Breeding report ----

export interface BreedingReportRow {
  id: number
  booking_number: string
  customer: string
  breeder: string
  status: BreedingEventStatus
  event_date: string
  description: string | null
}

export interface BreedingReportSummary {
  total: number
  by_status: Partial<Record<BreedingEventStatus, number>>
}

export interface BreedingReportParams extends ReportBaseParams {
  status?: BreedingEventStatus | ''
}

// ---- Egg report ----

export interface EggReportRow {
  id: number
  booking_number: string
  customer: string
  breeder: string
  total_eggs: number
  good_eggs: number
  bad_eggs: number
  good_egg_rate: string
  egg_date: string
  incubation_date: string | null
}

export interface EggReportSummary {
  total_batches: number
  total_eggs: number
  good_eggs: number
  bad_eggs: number
  good_egg_rate: string
}

export type EggReportParams = ReportBaseParams

// ---- Hatching report ----

export interface HatchingReportRow {
  id: number
  booking_number: string
  customer: string
  breeder: string
  total_eggs: number
  hatched_count: number
  failed_count: number
  survival_count: number
  hatching_rate: string
  status: HatchingStatus
  started_at: string
  completed_at: string | null
}

export interface HatchingReportSummary {
  total_batches: number
  total_eggs: number
  hatched_count: number
  failed_count: number
  survival_count: number
  hatching_rate: string
  by_status: Partial<Record<HatchingStatus, number>>
}

export interface HatchingReportParams extends ReportBaseParams {
  status?: HatchingStatus | ''
}

// ---- Chick report ----

export interface ChickReportRow {
  id: number
  wing_clip_number: string
  name: string | null
  booking_number: string
  customer: string
  breeder: string
  gender: ChickGender
  status: ChickStatus
  birth_date: string
}

export interface ChickReportSummary {
  total: number
  by_status: Partial<Record<ChickStatus, number>>
  by_gender: Partial<Record<ChickGender, number>>
}

export interface ChickReportParams extends ReportBaseParams {
  status?: ChickStatus | ''
  gender?: ChickGender | ''
}
