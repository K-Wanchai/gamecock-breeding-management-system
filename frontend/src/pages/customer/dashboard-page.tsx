import { CalendarClock, CheckCircle2, Clock, Feather, FileClock, XCircle } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardSummaryQuery } from '@/hooks/use-dashboard'
import type { BookingStatus } from '@/types/booking'
import type { DashboardSummary } from '@/types/dashboard'

/** by_status only contains statuses that actually have a booking — missing keys mean 0. */
function sumCounts(byStatus: DashboardSummary['bookings']['by_status'], statuses: BookingStatus[]): number {
  return statuses.reduce((total, status) => total + (byStatus[status] ?? 0), 0)
}

export function CustomerDashboardPage() {
  const { user } = useAuth()
  const { data: summary, isLoading, isError, refetch } = useDashboardSummaryQuery()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">แดชบอร์ด</h1>
        <p className="text-muted-foreground">ยินดีต้อนรับ, {user?.first_name || user?.username}</p>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError || !summary ? (
        <QueryError onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="การชำระเงินที่รอตรวจสอบ"
            value={summary.payments.pending_count}
            icon={FileClock}
            href="/app/payments"
            highlight={summary.payments.pending_count > 0}
          />
          <StatCard
            label="รอดำเนินการ"
            value={sumCounts(summary.bookings.by_status, ['PENDING', 'WAITING_PAYMENT', 'PAID'])}
            icon={Clock}
            href="/app/bookings"
          />
          <StatCard
            label="กำลังดำเนินการ"
            value={sumCounts(summary.bookings.by_status, ['APPROVED', 'IN_PROGRESS'])}
            icon={CalendarClock}
            href="/app/bookings"
          />
          <StatCard
            label="เสร็จสิ้น"
            value={summary.bookings.by_status.COMPLETED ?? 0}
            icon={CheckCircle2}
            href="/app/bookings"
          />
          <StatCard
            label="ยกเลิก/ปฏิเสธ"
            value={sumCounts(summary.bookings.by_status, ['CANCELLED', 'REJECTED'])}
            icon={XCircle}
            href="/app/bookings"
          />
          <StatCard
            label="ลูกไก่ทั้งหมด"
            value={summary.chicks?.total ?? 0}
            icon={Feather}
            href="/app/chicks"
          />
        </div>
      )}
    </div>
  )
}
