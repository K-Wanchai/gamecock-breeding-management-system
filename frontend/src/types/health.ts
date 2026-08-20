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
  page?: number
  chick?: number
  search?: string
}

/** weight is sent as a raw string from the number input — DRF's DecimalField accepts that directly. */
export interface HealthRecordCreatePayload {
  chick: number
  record_date: string
  weight?: string
  symptom?: string
  observation?: string
  medicine?: string
  remark?: string
}
