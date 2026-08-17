export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDING: 'รอส่ง',
  SENT: 'ส่งแล้ว',
  FAILED: 'ส่งไม่สำเร็จ',
}

interface NotificationBookingSummary {
  id: number
  booking_number: string
}

interface NotificationChickSummary {
  id: number
  wing_clip_number: string
}

export interface Notification {
  id: number
  channel: string
  notif_type: string
  booking: NotificationBookingSummary | null
  chick: NotificationChickSummary | null
  message: string
  status: NotificationStatus
  sent_at: string | null
  created_at: string
}

export interface NotificationListParams {
  page?: number
  status?: NotificationStatus | ''
}

export interface LineLinkCode {
  code: string
  expires_at: string
}
