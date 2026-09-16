import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HeartPulse } from 'lucide-react'
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

export function CustomerCareListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useBookingsQuery({
    page,
    search: debouncedSearch || undefined,
    status: 'COMPLETED',
  })

  const careBookings = data?.results.filter((b) => b.hen_brooding) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <HeartPulse className="size-6" />
          ติดตามสุขภาพและการอนุบาลลูกไก่
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ติดตามบันทึกสุขภาพและการฉีดวัคซีนลูกไก่ของท่าน
        </p>
      </div>

      <Input
        placeholder="ค้นหาเลขที่จอง, พ่อพันธุ์..."
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
      ) : careBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <HeartPulse className="mb-2 size-10 opacity-30" />
          <p>ยังไม่มีข้อมูลการอนุบาลไก่</p>
          <p className="mt-1 text-xs">จะแสดงที่นี่หลังจากไก่ฟักออกและเริ่มการอนุบาล</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่จอง</TableHead>
                  <TableHead>แม่ไก่</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>วันที่แม่ฟัก</TableHead>
                  <TableHead className="text-right">ดูข้อมูล</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {careBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.booking_number}</TableCell>
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
                        to={`/app/care/${booking.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                      >
                        <HeartPulse className="size-3.5" />
                        ดูบันทึก
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
