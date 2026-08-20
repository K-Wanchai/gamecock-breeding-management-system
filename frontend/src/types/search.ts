import type { BookingStatus } from '@/types/booking'

/** apps.reports.serializers.BookingSearchResultSerializer — cross-entity search is booking-centric. */
export interface BookingSearchResult {
  id: number
  booking_number: string
  customer: string
  hen: string
  breeder: string
  booking_date: string
  status: BookingStatus
  wing_clip_numbers: string[]
}

/**
 * `search` is free text (DRF SearchFilter across booking_number/hen/breeder/customer/wing_clip_number).
 * The other fields are precise per-field icontains filters and can be combined with it.
 */
export interface SearchParams {
  page?: number
  search?: string
  booking_number?: string
  customer?: string
  hen?: string
  breeder?: string
  wing_clip_number?: string
  date_from?: string
  date_to?: string
}
