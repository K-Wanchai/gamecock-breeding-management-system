export type BreedingEventStatus =
  | 'RECEIVED'
  | 'BREEDING'
  | 'BREEDING_COMPLETED'
  | 'WAITING_EGG'
  | 'EGG_LAID'
  | 'INCUBATION'
  | 'HATCHING'

/** Ordered to match apps.breeding.services.BREEDING_TRANSITIONS — used to render the timeline in stage order. */
export const BREEDING_EVENT_STAGES: BreedingEventStatus[] = [
  'RECEIVED',
  'BREEDING',
  'BREEDING_COMPLETED',
  'WAITING_EGG',
  'EGG_LAID',
  'INCUBATION',
  'HATCHING',
]

export const BREEDING_EVENT_LABEL: Record<BreedingEventStatus, string> = {
  RECEIVED: 'รับแม่ไก่เข้าฟาร์ม',
  BREEDING: 'กำลังผสมพันธุ์',
  BREEDING_COMPLETED: 'ผสมพันธุ์เสร็จสิ้น',
  WAITING_EGG: 'รอออกไข่',
  EGG_LAID: 'ออกไข่แล้ว',
  INCUBATION: 'เข้าตู้ฟัก',
  HATCHING: 'ฟักไข่',
}

interface BookingSummary {
  id: number
  booking_number: string
  status: string
}

export interface BreedingEvent {
  id: number
  booking: BookingSummary
  status: BreedingEventStatus
  event_date: string
  description: string | null
  recorded_by: { id: number; username: string }
  created_at: string
  updated_at: string
}

/** good_egg_rate is a SerializerMethodField returning a string, 2dp. */
export interface Egg {
  id: number
  booking: BookingSummary
  total_eggs: number
  good_eggs: number
  bad_eggs: number
  good_egg_rate: string
  egg_date: string
  incubation_date: string | null
  remark: string | null
  recorded_by: { id: number; username: string }
  created_at: string
  updated_at: string
}

export interface BreedingEventListParams {
  booking?: number
}

export interface EggListParams {
  booking?: number
}
