import { useState } from 'react'
import { Link } from 'react-router-dom'
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

/** Only bookings that have reached the breeding pipeline are relevant here — earlier/terminal statuses belong to the bookings list instead. */
const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'IN_PROGRESS', label: 'กำลังดำเนินการผสม' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว/ล็อกคิว' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
]

export function AdminBreedingPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatus>('IN_PROGRESS')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">กระบวนการผสมพันธุ์</h1>

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
          onValueChange={(value: BookingStatus) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
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
                  <TableHead>สถานะ</TableHead>
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
