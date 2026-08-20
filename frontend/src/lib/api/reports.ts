import { api } from '@/lib/api/client'
import type { PaginatedReportResponse } from '@/types/api'
import type {
  BookingReportParams,
  BookingReportRow,
  BookingReportSummary,
  BreedingReportParams,
  BreedingReportRow,
  BreedingReportSummary,
  ChickReportParams,
  ChickReportRow,
  ChickReportSummary,
  EggReportParams,
  EggReportRow,
  EggReportSummary,
  HatchingReportParams,
  HatchingReportRow,
  HatchingReportSummary,
  PaymentReportParams,
  PaymentReportRow,
  PaymentReportSummary,
  RevenueReportParams,
  RevenueReportSummary,
} from '@/types/reports'

/** ADMIN only (apps.core.permissions.IsAdminRole) — every report merges a `summary` computed over the filtered-but-unpaginated queryset into the standard paginated envelope. */
export async function listBookingReport(
  params: BookingReportParams,
): Promise<PaginatedReportResponse<BookingReportRow, BookingReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<BookingReportRow, BookingReportSummary>>(
    '/reports/bookings/',
    { params },
  )
  return data
}

export async function listPaymentReport(
  params: PaymentReportParams,
): Promise<PaginatedReportResponse<PaymentReportRow, PaymentReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<PaymentReportRow, PaymentReportSummary>>(
    '/reports/payments/',
    { params },
  )
  return data
}

/** Reuses the payment report's row shape — the view pre-filters the queryset to APPROVED payments. */
export async function listRevenueReport(
  params: RevenueReportParams,
): Promise<PaginatedReportResponse<PaymentReportRow, RevenueReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<PaymentReportRow, RevenueReportSummary>>(
    '/reports/revenue/',
    { params },
  )
  return data
}

export async function listBreedingReport(
  params: BreedingReportParams,
): Promise<PaginatedReportResponse<BreedingReportRow, BreedingReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<BreedingReportRow, BreedingReportSummary>>(
    '/reports/breeding/',
    { params },
  )
  return data
}

export async function listEggReport(
  params: EggReportParams,
): Promise<PaginatedReportResponse<EggReportRow, EggReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<EggReportRow, EggReportSummary>>(
    '/reports/eggs/',
    { params },
  )
  return data
}

export async function listHatchingReport(
  params: HatchingReportParams,
): Promise<PaginatedReportResponse<HatchingReportRow, HatchingReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<HatchingReportRow, HatchingReportSummary>>(
    '/reports/hatchings/',
    { params },
  )
  return data
}

export async function listChickReport(
  params: ChickReportParams,
): Promise<PaginatedReportResponse<ChickReportRow, ChickReportSummary>> {
  const { data } = await api.get<PaginatedReportResponse<ChickReportRow, ChickReportSummary>>(
    '/reports/chicks/',
    { params },
  )
  return data
}
