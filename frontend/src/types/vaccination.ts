interface VaccinationChickSummary {
  id: number
  wing_clip_number: string
  name: string | null
}

export interface Vaccination {
  id: number
  chick: VaccinationChickSummary
  vaccine_name: string
  vaccination_date: string
  age_days: number | null
  dose_number: number
  remark: string | null
  recorded_by: { id: number; username: string }
  created_at: string
  updated_at: string
}

export interface VaccinationListParams {
  chick?: number
}
