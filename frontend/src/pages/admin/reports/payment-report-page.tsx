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
import { PaymentStatusBadge, PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { DateRangeFilter } from '@/components/reports/date-range-filter'
import { BreederFilterSelect } from '@/components/reports/breeder-filter-select'
import { CustomerIdFilter } from '@/components/reports/customer-id-filter'
import { usePaymentReportQuery } from '@/hooks/use-reports'
import type { PaymentStatus, PaymentType } from '@/types/payment'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'PENDING', label: 'รอตรวจสอบ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

const TYPE_OPTIONS: { value: PaymentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกประเภท' },
  { value: 'DEPOSIT', label: 'ชำระครั้งแรก' },
  { value: 'FULL', label: 'เต็มจำนวน' },
  { value: 'ADDITIONAL', label: 'ชำระเพิ่มเติม' },
]

export function PaymentReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL')
  const [paymentType, setPaymentType] = useState<PaymentType | 'ALL'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [breeder, setBreeder] = useState<number | undefined>(undefined)
  const [customer, setCustomer] = useState<number | undefined>(undefined)

  const { data, isLoading, isError, refetch } = usePaymentReportQuery({
    page,
    status: status === 'ALL' ? undefined : status,
    payment_type: paymentType === 'ALL' ? undefined : paymentType,
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

      <h1 className="text-2xl font-semibold">รายงานการชำระเงิน</h1>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="จำนวนรายการ" value={data.summary.total} />
          <StatCard label="มูลค่ารวม" value={`${data.summary.total_amount} บาท`} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value: PaymentStatus | 'ALL') => {
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
        <Select
          value={paymentType}
          onValueChange={(value: PaymentType | 'ALL') => {
            setPaymentType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
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
                  <TableHead>เลขที่ชำระเงิน</TableHead>
                  <TableHead>การจอง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>พ่อพันธุ์</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>วันที่โอน</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.payment_number}</TableCell>
                    <TableCell>{row.booking_number}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.breeder}</TableCell>
                    <TableCell>{PAYMENT_TYPE_LABEL[row.payment_type]}</TableCell>
                    <TableCell>{row.amount} บาท</TableCell>
                    <TableCell>{new Date(row.paid_at).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={row.status} />
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
