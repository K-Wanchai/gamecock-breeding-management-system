import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  listBookingReport,
  listBreedingReport,
  listChickReport,
  listEggReport,
  listHatchingReport,
  listPaymentReport,
  listRevenueReport,
} from '@/lib/api/reports'
import type {
  BookingReportParams,
  BreedingReportParams,
  ChickReportParams,
  EggReportParams,
  HatchingReportParams,
  PaymentReportParams,
  RevenueReportParams,
} from '@/types/reports'

export function useBookingReportQuery(params: BookingReportParams) {
  return useQuery({
    queryKey: ['reports', 'bookings', params],
    queryFn: () => listBookingReport(params),
    placeholderData: keepPreviousData,
  })
}

export function usePaymentReportQuery(params: PaymentReportParams) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: () => listPaymentReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useRevenueReportQuery(params: RevenueReportParams) {
  return useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => listRevenueReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useBreedingReportQuery(params: BreedingReportParams) {
  return useQuery({
    queryKey: ['reports', 'breeding', params],
    queryFn: () => listBreedingReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useEggReportQuery(params: EggReportParams) {
  return useQuery({
    queryKey: ['reports', 'eggs', params],
    queryFn: () => listEggReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useHatchingReportQuery(params: HatchingReportParams) {
  return useQuery({
    queryKey: ['reports', 'hatchings', params],
    queryFn: () => listHatchingReport(params),
    placeholderData: keepPreviousData,
  })
}

export function useChickReportQuery(params: ChickReportParams) {
  return useQuery({
    queryKey: ['reports', 'chicks', params],
    queryFn: () => listChickReport(params),
    placeholderData: keepPreviousData,
  })
}
