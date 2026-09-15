import { Badge } from '@/components/ui/badge'
import type { BookingStatus } from '@/types/booking'

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'รอดำเนินการ',
  WAITING_PAYMENT: 'รอชำระเงิน',
  PAID: 'ชำระเงินแล้ว',
  APPROVED: 'อนุมัติแล้ว/ล็อกคิว',
  IN_PROGRESS: 'กำลังดำเนินการผสม',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
  REJECTED: 'ปฏิเสธ',
}

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  WAITING_PAYMENT: 'outline',
  PAID: 'default',
  APPROVED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  REJECTED: 'destructive',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
