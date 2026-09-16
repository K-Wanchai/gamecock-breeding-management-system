import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bird, Egg as EggIcon, Plus, Syringe } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThaiDateInput } from '@/components/ui/thai-date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { EggFormDialog } from '@/components/breeding/egg-form-dialog'
import { HatchingCompleteDialog } from '@/components/breeding/hatching-complete-dialog'
import { ChickFormDialog } from '@/components/chicks/chick-form-dialog'
import { useBookingQuery, useMarkHenBrooding } from '@/hooks/use-bookings'
import { useInseminationRecordsQuery, useCreateInseminationRecord, useEggsQuery } from '@/hooks/use-breeding'
import { useHatchingsQuery } from '@/hooks/use-hatchings'
import { useChicksQuery } from '@/hooks/use-chicks'
import { toastApiError } from '@/lib/toast'
import { formatThaiDate } from '@/lib/utils'
import { HATCHING_STATUS_LABEL } from '@/types/hatching'
import { CHICK_GENDER_LABEL, CHICK_STATUS_LABEL } from '@/types/chick'
import type { BookingStatus } from '@/types/booking'
import type { Egg } from '@/types/breeding'
import type { Hatching } from '@/types/hatching'

const BOOKING_OPEN_STATUSES: BookingStatus[] = ['APPROVED', 'IN_PROGRESS']

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/* ─── Insemination form dialog ─────────────────────────────────────────── */

interface InseminationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: number
  nextSessionNumber: number
}

function InseminationFormDialog({ open, onOpenChange, bookingId, nextSessionNumber }: InseminationFormDialogProps) {
  const [recordDate, setRecordDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const createRecord = useCreateInseminationRecord()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createRecord.mutate(
      { booking: bookingId, record_date: recordDate, note: note || undefined },
      {
        onSuccess: () => {
          toast.success(`บันทึกการฉีดน้ำเชื้อครั้งที่ ${nextSessionNumber} แล้ว`)
          setNote('')
          onOpenChange(false)
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกการฉีดน้ำเชื้อ ครั้งที่ {nextSessionNumber}</DialogTitle>
          <DialogDescription>ระบบจะกำหนดลำดับครั้งที่โดยอัตโนมัติ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="insem_date">วันที่ฉีดน้ำเชื้อ</Label>
            <ThaiDateInput
              id="insem_date"
              max={todayStr()}
              value={recordDate}
              onValueChange={setRecordDate}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="insem_note">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="insem_note"
              rows={3}
              placeholder="เช่น วิธีการฉีด, ปริมาณน้ำเชื้อ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createRecord.isPending}>
              {createRecord.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Chick list ────────────────────────────────────────────────────────── */

function AdminChickList({ hatching }: { hatching: Hatching }) {
  const { data } = useChicksQuery({ hatching: hatching.id })
  const [formOpen, setFormOpen] = useState(false)
  const chickCount = data?.count ?? 0
  const canAddMore = chickCount < hatching.hatched_count

  return (
    <div className="flex flex-col gap-2 rounded bg-background p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">ลูกไก่ ({chickCount}/{hatching.hatched_count})</span>
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
              <span>{chick.wing_clip_number}{chick.name && ` — ${chick.name}`}</span>
              <span>{CHICK_GENDER_LABEL[chick.gender]} · {CHICK_STATUS_LABEL[chick.status]}</span>
            </li>
          ))}
        </ul>
      )}
      {formOpen && <ChickFormDialog open={formOpen} onOpenChange={setFormOpen} hatching={hatching} />}
    </div>
  )
}

/* ─── Egg card with hatching management ─────────────────────────────────── */

function AdminEggCard({ egg, bookingOpen }: { egg: Egg; bookingOpen: boolean }) {
  const { data } = useHatchingsQuery({ egg: egg.id })
  const [completingHatching, setCompletingHatching] = useState<Hatching | null>(null)
  const hatching = data?.results[0]

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>วันที่ออกไข่: {formatThaiDate(egg.egg_date)}</span>
        <span>
          ไข่ทั้งหมด {egg.total_eggs} ฟอง (ดี {egg.good_eggs} / เสีย {egg.bad_eggs}, อัตรา {egg.good_egg_rate}%)
        </span>
      </div>

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
          <p>ฟักออก {hatching.hatched_count} / ไม่สำเร็จ {hatching.failed_count} / รอดชีวิต {hatching.survival_count}</p>
          {hatching.status === 'INCUBATING' && (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setCompletingHatching(hatching)}>
              บันทึกผลการฟัก
            </Button>
          )}
          {hatching.status === 'HATCHED' && <AdminChickList hatching={hatching} />}
        </div>
      )}

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

/* ─── Main page ─────────────────────────────────────────────────────────── */

export function AdminBreedingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)

  const [inseminationFormOpen, setInseminationFormOpen] = useState(false)
  const [eggFormOpen, setEggFormOpen] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const { data: inseminations } = useInseminationRecordsQuery({ booking: bookingId })
  const { data: eggs } = useEggsQuery({ booking: bookingId })
  const markBrooding = useMarkHenBrooding()

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  const bookingOpen = BOOKING_OPEN_STATUSES.includes(booking.status)
  const canRecord = bookingOpen && !booking.hen_brooding
  const nextSessionNumber = (inseminations?.results.length ?? 0) + 1

  function handleMarkBrooding() {
    if (!confirm('ยืนยันว่าแม่ไก่เข้าฟักแล้ว? การบันทึกการฉีดน้ำเชื้อและการออกไข่จะถูกปิด')) return
    markBrooding.mutate(bookingId, {
      onSuccess: () => toast.success('บันทึกสถานะแม่ไก่เข้าฟักแล้ว'),
      onError: toastApiError,
    })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/admin/breeding"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปกระบวนการผสมพันธุ์
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">บันทึกการผสมพันธุ์ · {booking.booking_number}</h1>
          <p className="text-sm text-muted-foreground">
            {booking.hen.name}{booking.hen.breed ? ` (${booking.hen.breed})` : ''} × {booking.breeder.name}
            {' · '}ลูกค้า: {booking.customer.username}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Brooding status banner */}
      {booking.hen_brooding && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          <Bird className="size-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200 font-medium">
            แม่ไก่เข้าฟักแล้ว — หยุดบันทึกการฉีดน้ำเชื้อและการออกไข่
          </span>
          {booking.brooding_started_at && (
            <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300 shrink-0">
              {formatThaiDate(booking.brooding_started_at)}
            </Badge>
          )}
        </div>
      )}

      {/* Insemination sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="size-4" />
            บันทึกการฉีดน้ำเชื้อ
          </CardTitle>
          {canRecord && (
            <Button size="sm" onClick={() => setInseminationFormOpen(true)}>
              <Plus className="size-3.5" />
              บันทึกครั้งใหม่
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!inseminations || inseminations.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกการฉีดน้ำเชื้อ</p>
          ) : (
            <ol className="flex flex-col gap-0">
              {inseminations.results.map((rec, idx) => {
                const isLast = idx === inseminations.results.length - 1
                return (
                  <li key={rec.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
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
          )}
        </CardContent>
      </Card>

      {/* Egg + hatching */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <EggIcon className="size-4" />
            ข้อมูลไข่และการฟัก
          </CardTitle>
          {canRecord && (
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
            <>
              {eggs.results.map((egg) => (
                <AdminEggCard key={egg.id} egg={egg} bookingOpen={bookingOpen} />
              ))}
              {/* eggs.results is ordered newest-first (-egg_date) → index 0 = latest survey */}
              <div className="mt-1 flex items-center justify-between rounded-lg bg-muted px-4 py-2.5">
                <span className="text-sm font-medium text-muted-foreground">ไข่ดีล่าสุด (สำรวจล่าสุด)</span>
                <span className="text-lg font-bold">
                  {eggs.results[0]?.good_eggs ?? 0}{' '}
                  <span className="text-sm font-normal text-muted-foreground">ฟอง</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mark brooding action */}
      {canRecord && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-medium">แม่ไก่เข้าฟักแล้ว</p>
              <p className="text-xs text-muted-foreground">
                กดเพื่อหยุดบันทึกการฉีดน้ำเชื้อและการออกไข่ ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400"
              disabled={markBrooding.isPending}
              onClick={handleMarkBrooding}
            >
              <Bird className="size-4" />
              แม่ไก่เข้าฟักแล้ว
            </Button>
          </CardContent>
        </Card>
      )}

      {inseminationFormOpen && (
        <InseminationFormDialog
          open={inseminationFormOpen}
          onOpenChange={setInseminationFormOpen}
          bookingId={bookingId}
          nextSessionNumber={nextSessionNumber}
        />
      )}
      {eggFormOpen && (
        <EggFormDialog open={eggFormOpen} onOpenChange={setEggFormOpen} bookingId={bookingId} />
      )}
    </div>
  )
}
