import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Egg } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useBookingTimelineQuery } from '@/hooks/use-bookings'
import { BREEDING_EVENT_LABEL, BREEDING_EVENT_STAGES } from '@/types/breeding'
import type { BookingTimeline, BookingTimelineBreedingEvent, BookingTimelineEgg } from '@/types/booking'

/* ─── Visual breeding stage pipeline ───────────────────────────────────── */

function BreedingPipeline({ events }: { events: BookingTimelineBreedingEvent[] }) {
  const doneStatuses = new Set(events.map((e) => e.status))
  const eventByStatus = Object.fromEntries(events.map((e) => [e.status, e]))

  return (
    <ol className="flex flex-col gap-0">
      {BREEDING_EVENT_STAGES.map((stage, idx) => {
        const isDone = doneStatuses.has(stage)
        const isLast = idx === BREEDING_EVENT_STAGES.length - 1
        const event = eventByStatus[stage] as BookingTimelineBreedingEvent | undefined

        return (
          <li key={stage} className="flex gap-3">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center">
              {isDone ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground/30 mt-0.5" />
              )}
              {!isLast && (
                <div className={['w-0.5 flex-1 my-1 rounded', isDone ? 'bg-emerald-300' : 'bg-muted'].join(' ')} />
              )}
            </div>

            {/* Content */}
            <div className={['flex flex-col pb-5', isLast ? 'pb-0' : ''].join(' ')}>
              <span className={['text-sm font-medium', isDone ? 'text-foreground' : 'text-muted-foreground/50'].join(' ')}>
                {BREEDING_EVENT_LABEL[stage]}
              </span>
              {event && (
                <span className="text-xs text-muted-foreground">{event.event_date}</span>
              )}
              {event?.description && (
                <span className="mt-0.5 text-xs text-muted-foreground">{event.description}</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ─── Egg record card ───────────────────────────────────────────────────── */

function EggCard({ egg }: { egg: BookingTimelineEgg }) {
  const rate = parseFloat(egg.good_egg_rate)
  const rateColor = rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-destructive'

  return (
    <div className="rounded-lg border p-3 flex flex-col gap-2">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Egg className="size-4 text-amber-500" />
          <span className="text-sm font-medium">วันที่ออกไข่: {egg.egg_date}</span>
        </div>
        <Badge variant="outline" className={`text-xs ${rateColor}`}>
          อัตราไข่ดี {egg.good_egg_rate}%
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-muted p-2">
          <p className="text-xs text-muted-foreground">ทั้งหมด</p>
          <p className="text-lg font-bold">{egg.total_eggs}</p>
          <p className="text-xs text-muted-foreground">ฟอง</p>
        </div>
        <div className="rounded bg-emerald-50 dark:bg-emerald-950 p-2">
          <p className="text-xs text-muted-foreground">ไข่ดี</p>
          <p className="text-lg font-bold text-emerald-600">{egg.good_eggs}</p>
          <p className="text-xs text-muted-foreground">ฟอง</p>
        </div>
        <div className="rounded bg-red-50 dark:bg-red-950 p-2">
          <p className="text-xs text-muted-foreground">ไข่เสีย</p>
          <p className="text-lg font-bold text-destructive">{egg.bad_eggs}</p>
          <p className="text-xs text-muted-foreground">ฟอง</p>
        </div>
      </div>

      {egg.incubation_date && (
        <p className="text-xs text-muted-foreground">
          วันที่เข้าตู้ฟัก: {egg.incubation_date}
        </p>
      )}
      {egg.remark && (
        <p className="text-xs text-muted-foreground">หมายเหตุ: {egg.remark}</p>
      )}
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

function TimelineContent({ timeline }: { timeline: BookingTimeline }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/app/breeding-timeline"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> กลับรายการไทม์ไลน์
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{timeline.booking_number}</h1>
          <p className="text-sm text-muted-foreground">
            {timeline.hen.name}
            {timeline.hen.breed ? ` (${timeline.hen.breed})` : ''} × {timeline.breeder.name}
            {timeline.queue_no !== null ? ` · คิวที่ ${timeline.queue_no}` : ''}
          </p>
        </div>
        <BookingStatusBadge status={timeline.status} />
      </div>

      {/* Breeding stage pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ขั้นตอนการผสมพันธุ์</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.breeding_events.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลความคืบหน้าการผสมพันธุ์</p>
          ) : (
            <BreedingPipeline events={timeline.breeding_events} />
          )}
        </CardContent>
      </Card>

      {/* Egg records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">การออกไข่</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.eggs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการออกไข่</p>
          ) : (
            <div className="flex flex-col gap-3">
              {timeline.eggs.map((egg) => (
                <EggCard key={egg.id} egg={egg} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function BreedingTimelineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useBookingTimelineQuery(Number(id))

  if (isLoading) return <SectionLoading />
  if (isError || !data) return <QueryError onRetry={refetch} />

  return <TimelineContent timeline={data} />
}
