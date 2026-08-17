import { Badge } from '@/components/ui/badge'
import type { PaymentStatus, PaymentType } from '@/types/payment'

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'รอตรวจสอบ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  CANCELLED: 'ยกเลิก',
}

const STATUS_VARIANT: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  DEPOSIT: 'มัดจำ',
  FULL: 'เต็มจำนวน',
  ADDITIONAL: 'ชำระเพิ่มเติม',
}
