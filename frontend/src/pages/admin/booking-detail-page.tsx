import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useBookingQuery } from '@/hooks/use-bookings'
import type { BookingStatus } from '@/types/booking'

const BREEDING_PROCESS_STATUSES: BookingStatus[] = ['APPROVED', 'IN_PROGRESS', 'COMPLETED']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/admin/bookings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการจอง
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">การจอง {booking.booking_number}</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลการจอง</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="ลูกค้า" value={booking.customer.username} />
          <InfoRow
            label="แม่ไก่"
            value={`${booking.hen.name}${booking.hen.breed ? ` (${booking.hen.breed})` : ''}`}
          />
          <InfoRow
            label="พ่อพันธุ์"
            value={`${booking.breeder.name}${booking.breeder.breed ? ` (${booking.breeder.breed})` : ''}`}
          />
          <InfoRow label="วันที่จอง" value={booking.booking_date} />
          {booking.queue_no !== null && <InfoRow label="หมายเลขคิว" value={booking.queue_no} />}
        </CardContent>
      </Card>

      {/* Link to Process 4 — breeding detail page */}
      {BREEDING_PROCESS_STATUSES.includes(booking.status) && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Process 4 · กระบวนการผสมพันธุ์
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                บันทึกขั้นตอนการผสม ไข่ การฟัก และลูกไก่
              </p>
            </div>
            <Link
              to={`/admin/breeding/${bookingId}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              ไปยังบันทึกผสมพันธุ์
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
