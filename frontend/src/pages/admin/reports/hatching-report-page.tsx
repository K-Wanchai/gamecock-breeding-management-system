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
import { useHatchingReportQuery } from '@/hooks/use-reports'
import { HATCHING_STATUS_LABEL } from '@/types/hatching'
import type { HatchingStatus } from '@/types/hatching'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: HatchingStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'INCUBATING', label: HATCHING_STATUS_LABEL.INCUBATING },
  { value: 'HATCHED', label: HATCHING_STATUS_LABEL.HATCHED },
  { value: 'FAILED', label: HATCHING_STATUS_LABEL.FAILED },
]

export function HatchingReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<HatchingStatus | 'ALL'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [breeder, setBreeder] = useState<number | undefined>(undefined)
  const [customer, setCustomer] = useState<number | undefined>(undefined)

  const { data, isLoading, isError, refetch } = useHatchingReportQuery({
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

      <h1 className="text-2xl font-semibold">รายงานการฟักไข่</h1>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="จำนวนชุดฟัก" value={data.summary.total_batches} />
          <StatCard
            label="ฟักออก / ไม่สำเร็จ"
            value={`${data.summary.hatched_count} / ${data.summary.failed_count}`}
          />
          <StatCard label="รอดชีวิต" value={data.summary.survival_count} />
          <StatCard label="อัตราการฟัก" value={`${data.summary.hatching_rate}%`} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value: HatchingStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
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
                  <TableHead>ไข่ที่เข้าฟัก</TableHead>
                  <TableHead>ฟักออก</TableHead>
                  <TableHead>ไม่สำเร็จ</TableHead>
                  <TableHead>รอดชีวิต</TableHead>
                  <TableHead>อัตราการฟัก</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เริ่มฟัก</TableHead>
                  <TableHead>เสร็จสิ้น</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.booking_number}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.breeder}</TableCell>
                    <TableCell>{row.total_eggs}</TableCell>
                    <TableCell>{row.hatched_count}</TableCell>
                    <TableCell>{row.failed_count}</TableCell>
                    <TableCell>{row.survival_count}</TableCell>
                    <TableCell>{row.hatching_rate}%</TableCell>
                    <TableCell>{HATCHING_STATUS_LABEL[row.status]}</TableCell>
                    <TableCell>{row.started_at}</TableCell>
                    <TableCell>{row.completed_at || '-'}</TableCell>
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
