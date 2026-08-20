import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
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
import { DateRangeFilter } from '@/components/reports/date-range-filter'
import { useSearchQuery } from '@/hooks/use-search'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const PAGE_SIZE = 20

export function AdminSearchPage() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const debouncedQuery = useDebouncedValue(query)

  const { data, isLoading, isError, refetch } = useSearchQuery({
    page,
    search: debouncedQuery || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ค้นหา</h1>
      <p className="text-muted-foreground">
        ค้นหาข้ามทุกลูกค้าด้วยเลขที่จอง, ชื่อลูกค้า, ชื่อแม่ไก่, ชื่อพ่อพันธุ์ หรือเลขปีกกิ๊ป
      </p>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหา..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(v) => {
            setDateFrom(v)
            setPage(1)
          }}
          onDateToChange={(v) => {
            setDateTo(v)
            setPage(1)
          }}
        />
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {query || dateFrom || dateTo ? 'ไม่พบผลการค้นหา' : 'พิมพ์คำค้นหาเพื่อเริ่มค้นหา'}
        </p>
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
                  <TableHead>เลขปีกกิ๊ป</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/bookings/${row.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.hen}</TableCell>
                    <TableCell>{row.breeder}</TableCell>
                    <TableCell>{row.booking_date}</TableCell>
                    <TableCell>{row.wing_clip_numbers.join(', ') || '-'}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={row.status} />
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
