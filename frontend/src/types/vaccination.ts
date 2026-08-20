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
  page?: number
  chick?: number
  search?: string
}

/** age_days is never client-supplied — the server computes it from vaccination_date - chick.birth_date. */
export interface VaccinationCreatePayload {
  chick: number
  vaccine_name: string
  vaccination_date: string
  dose_number: number
  remark?: string
}
