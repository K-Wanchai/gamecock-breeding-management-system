import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatThaiDate } from '@/lib/utils'

const PAGE_SIZE = 20

export function AdminWingClipListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status: 'COMPLETED',
    clip_ready: true,
  })

  const readyBookings = data?.results ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="size-6" />
          จัดทำเลขกิ๊ปและออกใบประวัติ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          กำหนดเลขกิ๊ปปีกและออกใบรับรองสายพันธุ์ / เอกสารส่งมอบลูกไก่
        </p>
      </div>

      <Input
        placeholder="ค้นหาเลขที่จอง, ลูกค้า, พ่อพันธุ์..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-xs"
      />

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : readyBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <FileText className="mb-2 size-10 opacity-30" />
          <p>ยังไม่มีรายการที่พร้อมออกเอกสาร</p>
          <p className="mt-1 text-xs">จะแสดงที่นี่เมื่อกดพร้อมจัดทำจากหน้าบันทึกสุขภาพ</p>
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
                  <TableHead>วันที่แม่ฟัก</TableHead>
                  <TableHead className="text-right">ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.booking_number}</TableCell>
                    <TableCell>{booking.customer.username}</TableCell>
                    <TableCell>
                      {booking.hen.name}
                      {booking.hen.breed && (
                        <span className="ml-1 text-xs text-muted-foreground">({booking.hen.breed})</span>
                      )}
                    </TableCell>
                    <TableCell>{booking.breeder.name}</TableCell>
                    <TableCell>
                      {booking.brooding_started_at ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          {formatThaiDate(booking.brooding_started_at)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/wing-clip/${booking.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <FileText className="size-3.5" />
                        จัดทำเอกสาร
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data?.count ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
