import { Link } from 'react-router-dom'
import { CalendarClock, Wallet, TrendingUp, Bird, Dna, Egg, Feather } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { StatCard } from '@/components/shared/stat-card'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardSummaryQuery } from '@/hooks/use-dashboard'

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { data: summary, isLoading, isError, refetch } = useDashboardSummaryQuery()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">แดชบอร์ดผู้ดูแลระบบ</h1>
        <p className="text-muted-foreground">ยินดีต้อนรับ, {user?.first_name || user?.username}</p>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError || !summary ? (
        <QueryError onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="การจองทั้งหมด"
              value={summary.bookings.total}
              icon={CalendarClock}
              href="/admin/bookings"
            />
            <StatCard
              label="จองใหม่เดือนนี้"
              value={summary.bookings.this_month ?? 0}
              icon={CalendarClock}
              href="/admin/bookings"
            />
            <StatCard
              label="รอตรวจสอบการชำระเงิน"
              value={`${summary.payments.pending_count} รายการ (${summary.payments.pending_amount ?? 0} บาท)`}
              icon={Wallet}
              href="/admin/payments"
              highlight={summary.payments.pending_count > 0}
            />
            <StatCard
              label="รายได้เดือนนี้"
              value={`${summary.revenue?.this_month ?? 0} บาท`}
              icon={TrendingUp}
              href="/admin/reports/revenue"
            />
            <StatCard
              label="รายได้ปีนี้"
              value={`${summary.revenue?.this_year ?? 0} บาท`}
              icon={TrendingUp}
              href="/admin/reports/revenue"
            />
            <StatCard
              label="พ่อพันธุ์ที่ให้บริการ"
              value={summary.breeders?.active ?? 0}
              icon={Bird}
              href="/admin/breeders"
            />
            <StatCard
              label="กำลังผสมพันธุ์"
              value={summary.breeding?.in_progress ?? 0}
              icon={Dna}
              href="/admin/breeding"
            />
            <StatCard label="กำลังฟักไข่" value={summary.hatching?.incubating ?? 0} icon={Egg} />
            <StatCard
              label="ลูกไก่มีชีวิต"
              value={summary.chicks?.alive ?? 0}
              icon={Feather}
              href="/admin/chicks"
            />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">การจองล่าสุด</h2>
            {summary.recent_bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีการจอง</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่จอง</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>แม่ไก่</TableHead>
                      <TableHead>พ่อพันธุ์</TableHead>
                      <TableHead>วันที่จอง</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recent_bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/admin/bookings/${booking.id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {booking.booking_number}
                          </Link>
                        </TableCell>
                        <TableCell>{booking.customer}</TableCell>
                        <TableCell>{booking.hen}</TableCell>
                        <TableCell>{booking.breeder}</TableCell>
                        <TableCell>{booking.booking_date}</TableCell>
                        <TableCell>
                          <BookingStatusBadge status={booking.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
