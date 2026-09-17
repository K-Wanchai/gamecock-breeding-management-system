export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDING: 'รอส่ง',
  SENT: 'ส่งแล้ว',
  FAILED: 'ส่งไม่สำเร็จ',
}

export const NOTIF_TYPE_LABEL: Record<string, string> = {
  BOOKING_APPROVED: 'อนุมัติการจอง',
  BOOKING_CANCELLED: 'ยกเลิกการจอง',
  PAYMENT_APPROVED: 'ยืนยันการชำระเงิน (พร้อมที่อยู่ฟาร์ม)',
  PAYMENT_APPROVED_FOLLOWUP: 'ยืนยันการชำระเงิน',
  PAYMENT_REJECTED: 'ปฏิเสธการชำระเงิน',
  HEN_RECEIVED: 'รับแม่ไก่เข้าฟาร์ม',
  BREEDING_UPDATED: 'อัพเดตขั้นตอนการผสมพันธุ์',
  INSEMINATION_RECORDED: 'บันทึกการฉีดน้ำเชื้อ',
  EGG_RECORDED: 'บันทึกข้อมูลไข่',
  HATCHING_STARTED: 'เริ่มการฟักไข่',
  HATCHING_COMPLETED: 'ผลการฟักไข่',
  HEN_BROODING: 'แม่ไก่เริ่มกกไข่',
  CLIP_READY: 'เตรียมออกใบรับรองสายพันธุ์',
}

interface NotificationBookingSummary {
  id: number
  booking_number: string
}

interface NotificationChickSummary {
  id: number
  wing_clip_number: string
}

interface NotificationUserSummary {
  id: number
  username: string
}

export interface Notification {
  id: number
  user: NotificationUserSummary
  channel: string
  notif_type: string
  booking: NotificationBookingSummary | null
  chick: NotificationChickSummary | null
  message: string
  status: NotificationStatus
  sent_at: string | null
  error_note: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

/** No search_fields on the backend viewset — status/notif_type/channel filters and ordering only, no free-text search. */
export interface NotificationListParams {
  page?: number
  status?: NotificationStatus | ''
  notif_type?: string
}

