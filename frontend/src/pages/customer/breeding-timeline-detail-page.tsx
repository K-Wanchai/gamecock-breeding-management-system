import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bird, Egg as EggIcon, Syringe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useBookingTimelineQuery } from '@/hooks/use-bookings'
import { formatThaiDate } from '@/lib/utils'
import type {
  BookingTimeline,
  BookingTimelineInsemination,
  BookingTimelineEgg,
} from '@/types/booking'

/* ─── Insemination session list ─────────────────────────────────────────── */

function InseminationList({ inseminations }: { inseminations: BookingTimelineInsemination[] }) {
  if (inseminations.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกการฉีดน้ำเชื้อ</p>
  }

  return (
    <ol className="flex flex-col gap-0">
      {inseminations.map((rec, idx) => {
        const isLast = idx === inseminations.length - 1
        return (
          <li key={rec.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5 border border-primary/30">
                {rec.session_number}
              </div>
              {!isLast && <div className="w-0.5 flex-1 my-1 rounded bg-muted" />}
            </div>
            <div className={`flex flex-col pb-4 ${isLast ? 'pb-0' : ''}`}>
              <span className="text-sm font-medium">
                ครั้งที่ {rec.session_number} — {formatThaiDate(rec.record_date)}
              </span>
              {rec.note && (
                <span className="mt-0.5 text-xs text-muted-foreground">{rec.note}</span>
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
          <EggIcon className="size-4 text-amber-500" />
          <span className="text-sm font-medium">วันที่ออกไข่: {formatThaiDate(egg.egg_date)}</span>
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
        <p className="text-xs text-muted-foreground">วันที่เข้าตู้ฟัก: {formatThaiDate(egg.incubation_date)}</p>
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

      {/* Brooding status */}
      {timeline.hen_brooding && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          <Bird className="size-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200 font-medium">
            แม่ไก่เข้าฟักแล้ว — กำลังฟักไข่
          </span>
          {timeline.brooding_started_at && (
            <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300 shrink-0">
              {formatThaiDate(timeline.brooding_started_at)}
            </Badge>
          )}
        </div>
      )}

      {/* Insemination records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="size-4" />
            บันทึกการฉีดน้ำเชื้อ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InseminationList inseminations={timeline.inseminations} />
        </CardContent>
      </Card>

      {/* Egg records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <EggIcon className="size-4" />
            การออกไข่
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.eggs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการออกไข่</p>
          ) : (
            <div className="flex flex-col gap-3">
              {timeline.eggs.map((egg) => (
                <EggCard key={egg.id} egg={egg} />
              ))}
              {/* timeline.eggs is ordered oldest-first → last element = latest survey */}
              <div className="mt-1 flex items-center justify-between rounded-lg bg-muted px-4 py-2.5">
                <span className="text-sm font-medium text-muted-foreground">ไข่ดีล่าสุด (สำรวจล่าสุด)</span>
                <span className="text-lg font-bold">
                  {timeline.eggs[timeline.eggs.length - 1]?.good_eggs ?? 0}{' '}
                  <span className="text-sm font-normal text-muted-foreground">ฟอง</span>
                </span>
              </div>
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
