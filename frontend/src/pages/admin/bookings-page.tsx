import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useApproveBooking, useBookingsQuery, useCancelBooking } from '@/hooks/use-bookings'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toastApiError } from '@/lib/toast'
import type { Booking, BookingStatus } from '@/types/booking'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: BookingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'PENDING', label: 'รอดำเนินการ' },
  { value: 'WAITING_PAYMENT', label: 'รอชำระเงิน' },
  { value: 'PAID', label: 'ชำระเงินแล้ว' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว/ล็อกคิว' },
  { value: 'IN_PROGRESS', label: 'กำลังดำเนินการผสม' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
]

const CANCELLABLE_STATUSES: BookingStatus[] = [
  'PENDING',
  'WAITING_PAYMENT',
  'PAID',
  'APPROVED',
  'IN_PROGRESS',
]

export function AdminBookingsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL')
  const [bookingDate, setBookingDate] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [approvingBooking, setApprovingBooking] = useState<Booking | null>(null)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    booking_date: bookingDate || undefined,
  })

  const approveBooking = useApproveBooking()
  const cancelBooking = useCancelBooking()

  function confirmApprove() {
    if (!approvingBooking) return
    approveBooking.mutate(approvingBooking.id, {
      onSuccess: () => {
        toast.success(`อนุมัติการจอง ${approvingBooking.booking_number} และล็อกคิวแล้ว`)
        setApprovingBooking(null)
      },
      onError: (error) => {
        toastApiError(error)
        setApprovingBooking(null)
      },
    })
  }

  function confirmCancel() {
    if (!cancellingBooking) return
    cancelBooking.mutate(
      { id: cancellingBooking.id, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          toast.success(`ยกเลิกการจอง ${cancellingBooking.booking_number} แล้ว`)
          setCancellingBooking(null)
          setCancelReason('')
        },
        onError: (error) => {
          toastApiError(error)
          setCancellingBooking(null)
          setCancelReason('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">การซื้อล็อคฝากผสม</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหาเลขที่จอง, ชื่อแม่ไก่, พ่อพันธุ์..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value: BookingStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date" lang="th"
          value={bookingDate}
          onChange={(e) => {
            setBookingDate(e.target.value)
            setPage(1)
          }}
          className="w-44"
          aria-label="ค้นหาตามวันที่จอง"
        />
        {bookingDate && (
          <Button variant="ghost" size="sm" onClick={() => setBookingDate('')}>
            ล้างวันที่
          </Button>
        )}
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ไม่พบรายการจอง</p>
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
                  <TableHead>วันที่จอง</TableHead>
                  <TableHead>ราคา</TableHead>
                  <TableHead>คงเหลือ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/bookings/${booking.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {booking.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>{booking.customer.username}</TableCell>
                    <TableCell>{booking.hen.name}</TableCell>
                    <TableCell>{booking.breeder.name}</TableCell>
                    <TableCell>{booking.booking_date}</TableCell>
                    <TableCell>{booking.price} บาท</TableCell>
                    <TableCell>{booking.remaining_amount} บาท</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {booking.status === 'PAID' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setApprovingBooking(booking)}
                        >
                          อนุมัติ
                        </Button>
                      )}
                      {CANCELLABLE_STATUSES.includes(booking.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setCancellingBooking(booking)}
                        >
                          ยกเลิก
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      <AlertDialog
        open={Boolean(approvingBooking)}
        onOpenChange={(open) => !open && setApprovingBooking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>อนุมัติการจองนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              การจอง {approvingBooking?.booking_number} จะถูกอนุมัติและล็อกคิวให้ลูกค้าทันที
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={approveBooking.isPending}>
              ยืนยันอนุมัติ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(cancellingBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setCancellingBooking(null)
            setCancelReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกการจองนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              การจอง {cancellingBooking?.booking_number} จะถูกยกเลิก การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin_cancel_reason">เหตุผล (ถ้ามี)</Label>
            <Textarea
              id="admin_cancel_reason"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} disabled={cancelBooking.isPending}>
              ยืนยันยกเลิกการจอง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
