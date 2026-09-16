import { Link } from 'react-router-dom'
import { ArrowRight, Bird } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useBookingsQuery } from '@/hooks/use-bookings'
import { BREEDING_EVENT_LABEL, type BreedingEventStatus } from '@/types/breeding'

const BREEDING_STATUSES = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] as const

function BreedingStageChip({ stage }: { stage: string | null }) {
  if (!stage) {
    return <Badge variant="outline" className="text-muted-foreground text-xs">รอเริ่มกระบวนการ</Badge>
  }
  const label = BREEDING_EVENT_LABEL[stage as BreedingEventStatus] ?? stage
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-normal">
      {label}
    </Badge>
  )
}

export function BreedingTimelinePage() {
  const { data, isLoading, isError, refetch } = useBookingsQuery({ status: 'APPROVED' })
  const { data: dataIP } = useBookingsQuery({ status: 'IN_PROGRESS' })
  const { data: dataC } = useBookingsQuery({ status: 'COMPLETED' })

  if (isLoading) return <SectionLoading />
  if (isError) return <QueryError onRetry={refetch} />

  const all = [
    ...(dataIP?.results ?? []),
    ...(data?.results ?? []),
    ...(dataC?.results ?? []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">บันทึกไทม์ไลน์การฝากผสมและการออกไข่</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ติดตามความคืบหน้าการผสมพันธุ์และการออกไข่สำหรับแต่ละการจอง
        </p>
      </div>

      {all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bird className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีการจองที่อยู่ในกระบวนการผสมพันธุ์
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/bookings">ไปที่การจองของฉัน</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {all.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{booking.booking_number}</span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {booking.hen.name}
                    {booking.hen.breed ? ` (${booking.hen.breed})` : ''}
                    {' × '}
                    {booking.breeder.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">ขั้นตอนปัจจุบัน:</span>
                    <BreedingStageChip stage={booking.latest_breeding_status} />
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link to={`/app/breeding-timeline/${booking.id}`}>
                    ดูไทม์ไลน์
                    <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// re-export statuses for use in router type-checking
export { BREEDING_STATUSES }
