export interface BreederMonthlyQuota {
  id: number
  breeder: number
  breeder_name: string
  year: number
  month: number
  max_slots: number
  is_open: boolean
  remaining_slots: number
  created_at: string
  updated_at: string
}

export interface BreederMonthlyQuotaFormValues {
  year: string
  month: string
  max_slots: string
  is_open: boolean
}

export interface BreederMonthlyQuotaListParams {
  page?: number
  breeder?: number
  year?: number
  month?: number
  is_open?: boolean
}
