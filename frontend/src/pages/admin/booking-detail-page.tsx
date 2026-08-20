import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { BreedingTimeline } from '@/components/breeding/breeding-timeline'
import { BreedingEventFormDialog } from '@/components/breeding/breeding-event-form-dialog'
import { EggFormDialog } from '@/components/breeding/egg-form-dialog'
import { HatchingStartDialog } from '@/components/breeding/hatching-start-dialog'
import { HatchingCompleteDialog } from '@/components/breeding/hatching-complete-dialog'
import { ChickFormDialog } from '@/components/chicks/chick-form-dialog'
import { useBookingQuery } from '@/hooks/use-bookings'
import { useBreedingEventsQuery, useEggsQuery } from '@/hooks/use-breeding'
import { useHatchingsQuery } from '@/hooks/use-hatchings'
import { useChicksQuery } from '@/hooks/use-chicks'
import { getNextBreedingStage } from '@/types/breeding'
import { HATCHING_STATUS_LABEL } from '@/types/hatching'
import { CHICK_GENDER_LABEL, CHICK_STATUS_LABEL } from '@/types/chick'
import type { BookingStatus } from '@/types/booking'
import type { Egg } from '@/types/breeding'
import type { Hatching } from '@/types/hatching'

/** Breeding events/eggs may only be recorded while a booking is actively being worked (mirrors apps.breeding/eggs services' booking-open check). */
const BOOKING_OPEN_STATUSES: BookingStatus[] = ['APPROVED', 'IN_PROGRESS']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function AdminChickList({ hatching }: { hatching: Hatching }) {
  const { data } = useChicksQuery({ hatching: hatching.id })
  const [formOpen, setFormOpen] = useState(false)
  const chickCount = data?.count ?? 0
  const canAddMore = chickCount < hatching.hatched_count

  return (
    <div className="flex flex-col gap-2 rounded bg-background p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          ลูกไก่ ({chickCount}/{hatching.hatched_count})
        </span>
        {canAddMore && (
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            เพิ่มลูกไก่
          </Button>
        )}
      </div>
      {data && data.results.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {data.results.map((chick) => (
            <li key={chick.id} className="flex justify-between text-muted-foreground">
              <span>
                {chick.wing_clip_number}
                {chick.name && ` — ${chick.name}`}
              </span>
              <span>
                {CHICK_GENDER_LABEL[chick.gender]} · {CHICK_STATUS_LABEL[chick.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {formOpen && <ChickFormDialog open={formOpen} onOpenChange={setFormOpen} hatching={hatching} />}
    </div>
  )
}

function AdminEggCard({ egg, bookingOpen }: { egg: Egg; bookingOpen: boolean }) {
  const { data } = useHatchingsQuery({ egg: egg.id })
  const [startOpen, setStartOpen] = useState(false)
  const [completingHatching, setCompletingHatching] = useState<Hatching | null>(null)
  const hatching = data?.results[0]

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>วันที่ออกไข่: {egg.egg_date}</span>
        <span>
          ไข่ทั้งหมด {egg.total_eggs} ฟอง (ดี {egg.good_eggs} / เสีย {egg.bad_eggs}, อัตรา {egg.good_egg_rate}
          %)
        </span>
      </div>
      {egg.incubation_date && (
        <p className="text-sm text-muted-foreground">วันที่เข้าตู้ฟัก: {egg.incubation_date}</p>
      )}

      {data && !hatching && bookingOpen && (
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setStartOpen(true)}>
          เริ่มการฟัก
        </Button>
      )}

      {hatching && (
        <div className="flex flex-col gap-2 rounded bg-muted p-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{HATCHING_STATUS_LABEL[hatching.status]}</span>
            <span>อัตราการฟัก {hatching.hatching_rate}%</span>
          </div>
          <p className="text-muted-foreground">
            เริ่มฟัก {hatching.started_at}
            {hatching.completed_at && ` — เสร็จสิ้น ${hatching.completed_at}`}
          </p>
          <p>
            ฟักออก {hatching.hatched_count} / ไม่สำเร็จ {hatching.failed_count} / รอดชีวิต{' '}
            {hatching.survival_count}
          </p>
          {hatching.status === 'INCUBATING' && (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => setCompletingHatching(hatching)}
            >
              บันทึกผลการฟัก
            </Button>
          )}
          {hatching.status === 'HATCHED' && <AdminChickList hatching={hatching} />}
        </div>
      )}

      {startOpen && <HatchingStartDialog open={startOpen} onOpenChange={setStartOpen} eggId={egg.id} />}
      {completingHatching && (
        <HatchingCompleteDialog
          open={Boolean(completingHatching)}
          onOpenChange={(open) => !open && setCompletingHatching(null)}
          hatching={completingHatching}
        />
      )}
    </div>
  )
}

export function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)

  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [eggFormOpen, setEggFormOpen] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const { data: events } = useBreedingEventsQuery({ booking: bookingId })
  const { data: eggs } = useEggsQuery({ booking: bookingId })

  if (isLoading) {
    return <SectionLoading />
  }
  if (isError || !booking) {
    return <QueryError onRetry={refetch} />
  }

  const bookingOpen = BOOKING_OPEN_STATUSES.includes(booking.status)
  const nextStage = events ? getNextBreedingStage(events.results) : null

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ความคืบหน้าการผสมพันธุ์</CardTitle>
          {bookingOpen && nextStage && (
            <Button size="sm" onClick={() => setEventFormOpen(true)}>
              <Plus className="size-3.5" />
              บันทึกขั้นตอนถัดไป
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <BreedingTimeline events={events?.results ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ข้อมูลไข่และการฟัก</CardTitle>
          {bookingOpen && (
            <Button size="sm" onClick={() => setEggFormOpen(true)}>
              <Plus className="size-3.5" />
              บันทึกไข่
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!eggs || eggs.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลไข่</p>
          ) : (
            eggs.results.map((egg) => (
              <AdminEggCard key={egg.id} egg={egg} bookingOpen={bookingOpen} />
            ))
          )}
        </CardContent>
      </Card>

      {eventFormOpen && nextStage && (
        <BreedingEventFormDialog
          open={eventFormOpen}
          onOpenChange={setEventFormOpen}
          bookingId={bookingId}
          nextStatus={nextStage}
        />
      )}
      {eggFormOpen && (
        <EggFormDialog open={eggFormOpen} onOpenChange={setEggFormOpen} bookingId={bookingId} />
      )}
    </div>
  )
}
