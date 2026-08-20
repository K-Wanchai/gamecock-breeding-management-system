import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { useBookingsQuery } from '@/hooks/use-bookings'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { BookingStatus } from '@/types/booking'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: BookingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'PENDING', label: 'รอดำเนินการ' },
  { value: 'WAITING_PAYMENT', label: 'รอชำระเงิน' },
  { value: 'PAID', label: 'ชำระมัดจำแล้ว' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว/ล็อกคิว' },
  { value: 'IN_PROGRESS', label: 'กำลังดำเนินการผสม' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
]

export function BookingsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL')
  const [bookingDate, setBookingDate] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    booking_date: bookingDate || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">การจองของฉัน</h1>

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
          type="date"
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
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีการจอง</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่จอง</TableHead>
                  <TableHead>แม่ไก่</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>วันที่จอง</TableHead>
                  <TableHead>ราคา</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/app/bookings/${booking.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {booking.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>{booking.hen.name}</TableCell>
                    <TableCell>{booking.breeder.name}</TableCell>
                    <TableCell>{booking.booking_date}</TableCell>
                    <TableCell>{booking.price} บาท</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
