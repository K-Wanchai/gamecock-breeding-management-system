import { CalendarClock, CheckCircle2, Clock, Feather, Wallet, XCircle } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { SectionLoading } from '@/components/shared/loading'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardSummaryQuery } from '@/hooks/use-dashboard'
import type { BookingStatus } from '@/types/booking'

function sumCounts(counts: Record<BookingStatus, number>, statuses: BookingStatus[]): number {
  return statuses.reduce((total, status) => total + counts[status], 0)
}

export function CustomerDashboardPage() {
  const { user } = useAuth()
  const { data: summary, isLoading } = useDashboardSummaryQuery()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
        <p className="text-muted-foreground">ยินดีต้อนรับ, {user?.first_name || user?.username}</p>
      </div>

      {isLoading || !summary ? (
        <SectionLoading />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="ยอดค้างชำระ"
            value={`${summary.outstanding_payment_total} บาท`}
            icon={Wallet}
            href="/app/payments"
            highlight={Number(summary.outstanding_payment_total) > 0}
          />
          <StatCard
            label="รอดำเนินการ"
            value={sumCounts(summary.booking_counts, ['PENDING', 'WAITING_PAYMENT', 'PAID'])}
            icon={Clock}
            href="/app/bookings"
          />
          <StatCard
            label="กำลังดำเนินการ"
            value={sumCounts(summary.booking_counts, ['APPROVED', 'IN_PROGRESS'])}
            icon={CalendarClock}
            href="/app/bookings"
          />
          <StatCard
            label="เสร็จสิ้น"
            value={summary.booking_counts.COMPLETED}
            icon={CheckCircle2}
            href="/app/bookings"
          />
          <StatCard
            label="ยกเลิก/ปฏิเสธ"
            value={sumCounts(summary.booking_counts, ['CANCELLED', 'REJECTED'])}
            icon={XCircle}
            href="/app/bookings"
          />
          <StatCard
            label="ลูกไก่ทั้งหมด"
            value={summary.chick_count}
            icon={Feather}
            href="/app/chicks"
          />
        </div>
      )}
    </div>
  )
}
