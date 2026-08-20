import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
import { StatCard } from '@/components/shared/stat-card'
import { DateRangeFilter } from '@/components/reports/date-range-filter'
import { BreederFilterSelect } from '@/components/reports/breeder-filter-select'
import { CustomerIdFilter } from '@/components/reports/customer-id-filter'
import { useBreedingReportQuery } from '@/hooks/use-reports'
import { BREEDING_EVENT_LABEL } from '@/types/breeding'
import type { BreedingEventStatus } from '@/types/breeding'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: BreedingEventStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'RECEIVED', label: BREEDING_EVENT_LABEL.RECEIVED },
  { value: 'BREEDING', label: BREEDING_EVENT_LABEL.BREEDING },
  { value: 'BREEDING_COMPLETED', label: BREEDING_EVENT_LABEL.BREEDING_COMPLETED },
  { value: 'WAITING_EGG', label: BREEDING_EVENT_LABEL.WAITING_EGG },
  { value: 'EGG_LAID', label: BREEDING_EVENT_LABEL.EGG_LAID },
  { value: 'INCUBATION', label: BREEDING_EVENT_LABEL.INCUBATION },
  { value: 'HATCHING', label: BREEDING_EVENT_LABEL.HATCHING },
]

export function BreedingReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<BreedingEventStatus | 'ALL'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [breeder, setBreeder] = useState<number | undefined>(undefined)
  const [customer, setCustomer] = useState<number | undefined>(undefined)

  const { data, isLoading, isError, refetch } = useBreedingReportQuery({
    page,
    status: status === 'ALL' ? undefined : status,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    breeder,
    customer,
  })

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/reports"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายงาน
      </Link>

      <h1 className="text-2xl font-semibold">รายงานกระบวนการผสมพันธุ์</h1>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="จำนวนเหตุการณ์ทั้งหมด" value={data.summary.total} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value: BreedingEventStatus | 'ALL') => {
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
        <BreederFilterSelect
          value={breeder}
          onChange={(v) => {
            setBreeder(v)
            setPage(1)
          }}
        />
        <CustomerIdFilter
          value={customer}
          onChange={(v) => {
            setCustomer(v)
            setPage(1)
          }}
        />
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ไม่พบข้อมูล</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>การจอง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.booking_number}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.breeder}</TableCell>
                    <TableCell>{BREEDING_EVENT_LABEL[row.status]}</TableCell>
                    <TableCell>{row.event_date}</TableCell>
                    <TableCell>{row.description || '-'}</TableCell>
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
