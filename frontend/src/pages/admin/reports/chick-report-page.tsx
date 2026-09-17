import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatThaiDate } from '@/lib/utils'
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
import { useChickReportQuery } from '@/hooks/use-reports'
import { CHICK_GENDER_LABEL, CHICK_STATUS_LABEL } from '@/types/chick'
import type { ChickGender, ChickStatus } from '@/types/chick'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: ChickStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'ALIVE', label: 'มีชีวิต' },
  { value: 'DECEASED', label: 'ตาย' },
  { value: 'DELIVERED', label: 'ส่งมอบแล้ว' },
]

const GENDER_OPTIONS: { value: ChickGender | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกเพศ' },
  { value: 'MALE', label: 'ตัวผู้' },
  { value: 'FEMALE', label: 'ตัวเมีย' },
  { value: 'UNKNOWN', label: 'ยังไม่ทราบ' },
]

const STATUS_VARIANT: Record<ChickStatus, 'default' | 'secondary' | 'destructive'> = {
  ALIVE: 'default',
  DECEASED: 'destructive',
  DELIVERED: 'secondary',
}

export function ChickReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ChickStatus | 'ALL'>('ALL')
  const [gender, setGender] = useState<ChickGender | 'ALL'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [breeder, setBreeder] = useState<number | undefined>(undefined)
  const [customer, setCustomer] = useState<number | undefined>(undefined)

  const { data, isLoading, isError, refetch } = useChickReportQuery({
    page,
    status: status === 'ALL' ? undefined : status,
    gender: gender === 'ALL' ? undefined : gender,
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

      <h1 className="text-2xl font-semibold">รายงานลูกไก่</h1>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="จำนวนลูกไก่ทั้งหมด" value={data.summary.total} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value: ChickStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
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
        <Select
          value={gender}
          onValueChange={(value: ChickGender | 'ALL') => {
            setGender(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((option) => (
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
                  <TableHead>เลขปีกกิ๊ป</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>การจอง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>เพศ</TableHead>
                  <TableHead>วันเกิด</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.wing_clip_number}</TableCell>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>{row.booking_number}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.breeder}</TableCell>
                    <TableCell>{CHICK_GENDER_LABEL[row.gender]}</TableCell>
                    <TableCell>{formatThaiDate(row.birth_date)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{CHICK_STATUS_LABEL[row.status]}</Badge>
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
