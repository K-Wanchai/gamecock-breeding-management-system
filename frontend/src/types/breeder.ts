export type BreederStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED'

/** Decimal fields (service_rate) serialize as strings from DRF — never coerce with +/parseFloat for display, only for math. */
export interface Breeder {
  id: number
  name: string
  breed: string | null
  bloodline: string | null
  description: string | null
  image: string | null
  service_rate: string
  default_monthly_quota: number
  status: BreederStatus
  service_start_date: string | null
  created_by: number | null
  created_by_username: string | null
  remaining_quota_this_month: number
  created_at: string
  updated_at: string
}

export interface BreederListParams {
  page?: number
  search?: string
  status?: BreederStatus | ''
}

/** Form-facing shape — service_rate/default_monthly_quota stay strings while the user is typing. */
export interface BreederFormValues {
  name: string
  breed: string
  bloodline: string
  description: string
  service_rate: string
  default_monthly_quota: string
  status: BreederStatus
  service_start_date: string
  image: File | null
}
