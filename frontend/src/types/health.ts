interface HealthChickSummary {
  id: number
  wing_clip_number: string
  name: string | null
}

/** weight serializes as a string (DRF DecimalField). */
export interface HealthRecord {
  id: number
  chick: HealthChickSummary
  record_date: string
  weight: string | null
  symptom: string | null
  observation: string | null
  medicine: string | null
  remark: string | null
  recorded_by: { id: number; username: string }
  created_at: string
  updated_at: string
}

export interface HealthRecordListParams {
  chick?: number
}
