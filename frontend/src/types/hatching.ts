export type HatchingStatus = 'INCUBATING' | 'HATCHED' | 'FAILED'

export const HATCHING_STATUS_LABEL: Record<HatchingStatus, string> = {
  INCUBATING: 'กำลังฟัก',
  HATCHED: 'ฟักออกแล้ว',
  FAILED: 'ฟักไม่สำเร็จ',
}

interface EggSummary {
  id: number
  booking: number
  total_eggs: number
  egg_date: string
}

/** hatching_rate is a SerializerMethodField returning a string, 2dp. */
export interface Hatching {
  id: number
  egg: EggSummary
  status: HatchingStatus
  started_at: string
  completed_at: string | null
  total_eggs: number
  hatched_count: number
  failed_count: number
  survival_count: number
  hatching_rate: string
  remark: string | null
  recorded_by: { id: number; username: string }
  created_at: string
  updated_at: string
}

export interface HatchingListParams {
  egg?: number
}

export interface HatchingStartPayload {
  egg: number
  started_at: string
  remark?: string
}

export interface HatchingCompletePayload {
  completed_at: string
  hatched_count: number
  failed_count?: number
  survival_count?: number
  remark?: string
}
