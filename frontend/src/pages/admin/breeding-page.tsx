import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BirdIcon, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Pagination } from '@/components/shared/pagination'
import { useBookingsQuery } from '@/hooks/use-bookings'
import { useCreateBreedingEvent } from '@/hooks/use-breeding'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toastApiError } from '@/lib/toast'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import {
  BREEDING_EVENT_LABEL,
  BREEDING_EVENT_STAGES,
  type BreedingEventStatus,
} from '@/types/breeding'
import type { Booking } from '@/types/booking'

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function todayLocal() {
  return new Date().toISOString().slice(0, 10)
}

function nextStage(current: string | null): BreedingEventStatus | null {
  if (!current) return 'RECEIVED'
  const idx = BREEDING_EVENT_STAGES.indexOf(current as BreedingEventStatus)
  if (idx === -1 || idx === BREEDING_EVENT_STAGES.length - 1) return null
  return BREEDING_EVENT_STAGES[idx + 1]
}

function BreedingStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">ยังไม่เริ่ม</Badge>
  const label = BREEDING_EVENT_LABEL[status as BreedingEventStatus] ?? status
  const colorMap: Partial<Record<BreedingEventStatus, string>> = {
    RECEIVED: 'bg-sky-100 text-sky-700 border-sky-300',
    BREEDING: 'bg-blue-100 text-blue-700 border-blue-300',
    BREEDING_COMPLETED: 'bg-teal-100 text-teal-700 border-teal-300',
    WAITING_EGG: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    EGG_LAID: 'bg-orange-100 text-orange-700 border-orange-300',
    INCUBATION: 'bg-purple-100 text-purple-700 border-purple-300',
    HATCHING: 'bg-green-100 text-green-700 border-green-300',
  }
  return (
    <Badge variant="outline" className={colorMap[status as BreedingEventStatus] ?? ''}>
      {label}
    </Badge>
  )
}

/* ─── Update Stage Dialog ──────────────────────────────────────────────── */

function UpdateStageDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: Booking
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [eventDate, setEventDate] = useState(todayLocal)
  const [description, setDescription] = useState('')
  const createEvent = useCreateBreedingEvent()

  const currentStatus = booking.latest_breeding_status
  const next = nextStage(currentStatus)
  const nextLabel = next ? BREEDING_EVENT_LABEL[next] : null
  const currentLabel = currentStatus ? BREEDING_EVENT_LABEL[currentStatus as BreedingEventStatus] : 'ยังไม่เริ่ม'

  function handleSubmit() {
    if (!next) return
    createEvent.mutate(
      {
        booking: booking.id,
        status: next,
        event_date: eventDate,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`อัพเดตขั้นตอน "${nextLabel}" แล้ว (${booking.booking_number})`)
          onOpenChange(false)
          setDescription('')
          setEventDate(todayLocal())
        },
        onError: toastApiError,
      },
    )
  }

  if (!next || !nextLabel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>อัพเดตขั้นตอนการผสมพันธุ์</DialogTitle>
          <DialogDescription>{booking.booking_number}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">{currentLabel}</span>
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-primary">{nextLabel}</span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="event_date">วันที่</Label>
            <Input
              id="event_date"
              type="date"
              max={todayLocal()}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">บันทึก (ถ้ามี)</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder={`หมายเหตุเกี่ยวกับ ${nextLabel}...`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={createEvent.isPending}>
            {createEvent.isPending ? 'กำลังบันทึก...' : `บันทึก: ${nextLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Receive Hen Section ──────────────────────────────────────────────── */


const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: 'รอดำเนินการ',
  WAITING_PAYMENT: 'รอชำระเงิน',
  PAID: 'ชำระแล้ว (รอแอดมินอนุมัติ)',
  APPROVED: 'อนุมัติแล้ว — พร้อมรับไก่',
  IN_PROGRESS: 'รับไก่เข้าฟาร์มแล้ว (กำลังผสมพันธุ์)',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิกแล้ว',
  REJECTED: 'ปฏิเสธแล้ว',
}

function ReceiveHenSection() {
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const createEvent = useCreateBreedingEvent()

  // Search ALL statuses so we can give a helpful message when status is wrong
  const { data, isFetching } = useBookingsQuery(
    { search: searchTerm || undefined },
  )

  const exactMatch = searchTerm
    ? (data?.results.find(
        (b) => b.booking_number.toLowerCase() === searchTerm.toLowerCase(),
      ) ?? null)
    : null

  function handleSearch() {
    const term = inputValue.trim()
    if (term) setSearchTerm(term)
  }

  function handleReceive() {
    if (!exactMatch) return
    createEvent.mutate(
      {
        booking: exactMatch.id,
        status: 'RECEIVED',
        event_date: todayLocal(),
        description: 'รับแม่ไก่เข้าฟาร์ม',
      },
      {
        onSuccess: () => {
          toast.success(`รับแม่ไก่เข้าฟาร์มแล้ว (${exactMatch.booking_number})`)
          setInputValue('')
          setSearchTerm('')
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Card className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
          <BirdIcon className="size-4" />
          รับแม่ไก่เข้าฟาร์ม
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="กรอกเลขที่จอง เช่น BK-69-00001"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-xs bg-white dark:bg-background"
          />
          <Button type="button" onClick={handleSearch} variant="outline" size="icon" className="shrink-0">
            <Search className="size-4" />
          </Button>
        </div>

        {isFetching && searchTerm && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <RefreshCw className="size-3.5 animate-spin" /> กำลังค้นหา...
          </p>
        )}

        {/* Found booking — check its status */}
        {!isFetching && exactMatch && (
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border bg-white dark:bg-background p-3 text-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold">{exactMatch.booking_number}</p>
                <BookingStatusBadge status={exactMatch.status} />
              </div>
              <p className="text-muted-foreground">ลูกค้า: {exactMatch.customer.username}</p>
              <p className="text-muted-foreground">
                แม่ไก่: <span className="font-medium text-foreground">{exactMatch.hen.name}</span>
                {exactMatch.hen.breed ? ` (${exactMatch.hen.breed})` : ''}
              </p>
              <p className="text-muted-foreground">
                พ่อพันธุ์: <span className="font-medium text-foreground">{exactMatch.breeder.name}</span>
              </p>
            </div>

            {exactMatch.status === 'APPROVED' ? (
              <Button
                onClick={handleReceive}
                disabled={createEvent.isPending}
                className="self-end bg-green-600 hover:bg-green-700"
              >
                {createEvent.isPending ? 'กำลังบันทึก...' : 'รับไก่เข้าฟาร์ม'}
              </Button>
            ) : (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                ไม่สามารถรับได้: {BOOKING_STATUS_LABEL[exactMatch.status] ?? exactMatch.status}
              </div>
            )}
          </div>
        )}

        {/* Not found */}
        {!isFetching && searchTerm && !exactMatch && data && (
          <p className="text-sm text-destructive">
            ไม่พบการจองหมายเลข &ldquo;{searchTerm}&rdquo;
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Active Breedings Table ───────────────────────────────────────────── */

const PAGE_SIZE = 20

function ActiveBreedingsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status: 'IN_PROGRESS',
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">ไก่ที่อยู่ในกระบวนการผสมพันธุ์</h2>
        <Input
          placeholder="ค้นหาเลขที่จอง, ลูกค้า, พ่อพันธุ์..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <BirdIcon className="mb-2 size-10 opacity-30" />
          <p>ยังไม่มีการจองที่กำลังดำเนินการ</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่จอง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>แม่ไก่</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>ขั้นตอนปัจจุบัน</TableHead>
                  <TableHead className="text-right">ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((booking) => {
                  const next = nextStage(booking.latest_breeding_status)
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/admin/breeding/${booking.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {booking.booking_number}
                        </Link>
                      </TableCell>
                      <TableCell>{booking.customer.username}</TableCell>
                      <TableCell>{booking.hen.name}</TableCell>
                      <TableCell>{booking.breeder.name}</TableCell>
                      <TableCell>
                        <BreedingStatusBadge status={booking.latest_breeding_status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {next ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <ChevronRight className="mr-1 size-3.5" />
                            {BREEDING_EVENT_LABEL[next]}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            เสร็จสิ้น
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      {selectedBooking && (
        <UpdateStageDialog
          booking={selectedBooking}
          open={Boolean(selectedBooking)}
          onOpenChange={(v) => !v && setSelectedBooking(null)}
        />
      )}
    </div>
  )
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export function AdminBreedingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">กระบวนการผสมพันธุ์</h1>
      <ReceiveHenSection />
      <ActiveBreedingsTable />
    </div>
  )
}
