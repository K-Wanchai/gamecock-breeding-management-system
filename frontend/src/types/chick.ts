export type ChickGender = 'MALE' | 'FEMALE' | 'UNKNOWN'
export type ChickStatus = 'ALIVE' | 'DECEASED' | 'DELIVERED'

export const CHICK_GENDER_LABEL: Record<ChickGender, string> = {
  MALE: 'ตัวผู้',
  FEMALE: 'ตัวเมีย',
  UNKNOWN: 'ยังไม่ทราบ',
}

export const CHICK_STATUS_LABEL: Record<ChickStatus, string> = {
  ALIVE: 'มีชีวิต',
  DECEASED: 'ตาย',
  DELIVERED: 'ส่งมอบแล้ว',
}

interface ChickHatchingSummary {
  id: number
  status: string
  hatched_count: number
}

interface ChickBookingSummary {
  id: number
  booking_number: string
}

export interface Chick {
  id: number
  hatching: ChickHatchingSummary
  booking: ChickBookingSummary
  name: string | null
  wing_clip_number: string
  birth_date: string
  gender: ChickGender
  color_note: string | null
  status: ChickStatus
  created_at: string
  updated_at: string
}

export interface ChickListParams {
  page?: number
  hatching?: number
  status?: ChickStatus | ''
  gender?: ChickGender | ''
  search?: string
}

/** booking/wing_clip_number are never client-supplied — server derives them from the hatching. */
export interface ChickCreatePayload {
  hatching: number
  name?: string
  birth_date: string
  gender?: ChickGender
  color_note?: string
}
