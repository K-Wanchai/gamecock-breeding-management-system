import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import type { BookingStatus } from '@/types/booking'

const CASES: [BookingStatus, string][] = [
  ['PENDING', 'รอดำเนินการ'],
  ['WAITING_PAYMENT', 'รอชำระเงิน'],
  ['PAID', 'ชำระมัดจำแล้ว'],
  ['APPROVED', 'อนุมัติแล้ว/ล็อกคิว'],
  ['IN_PROGRESS', 'กำลังดำเนินการผสม'],
  ['COMPLETED', 'เสร็จสิ้น'],
  ['CANCELLED', 'ยกเลิก'],
  ['REJECTED', 'ปฏิเสธ'],
]

describe('BookingStatusBadge', () => {
  it.each(CASES)('renders the Thai label for %s', (status, label) => {
    render(<BookingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('uses the destructive badge variant for terminal negative outcomes', () => {
    render(<BookingStatusBadge status="CANCELLED" />)
    expect(screen.getByText('ยกเลิก')).toHaveAttribute('data-variant', 'destructive')
  })
})
