import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { StatCard } from '@/components/shared/stat-card'
import { PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { DateRangeFilter } from '@/components/reports/date-range-filter'
import { BreederFilterSelect } from '@/components/reports/breeder-filter-select'
import { CustomerIdFilter } from '@/components/reports/customer-id-filter'
import { useRevenueReportQuery } from '@/hooks/use-reports'

const PAGE_SIZE = 20

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

function formatMonth(iso: string): string {
  const d = new Date(iso)
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
}

export function RevenueReportPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [breeder, setBreeder] = useState<number | undefined>(undefined)
  const [customer, setCustomer] = useState<number | undefined>(undefined)

  const { data, isLoading, isError, refetch } = useRevenueReportQuery({
    page,
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

      <h1 className="text-2xl font-semibold">รายงานรายได้</h1>

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="จำนวนรายการที่อนุมัติแล้ว" value={data.summary.total} />
            <StatCard label="รายได้รวม" value={`${data.summary.total_amount} บาท`} highlight />
          </div>

          {(data.summary.by_month.length > 0 || data.summary.by_breeder.length > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.summary.by_month.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">รายได้ตามเดือน</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {data.summary.by_month.map((row) => (
                      <div key={row.month} className="flex justify-between py-1.5 text-sm">
                        <span className="text-muted-foreground">{formatMonth(row.month)}</span>
                        <span className="font-medium">{row.total} บาท</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {data.summary.by_breeder.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">รายได้ตามพ่อพันธุ์ (สูงสุด 10)</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {data.summary.by_breeder.map((row, index) => (
                      <div
                        key={`${row.breeder_name}-${index}`}
                        className="flex justify-between py-1.5 text-sm"
                      >
                        <span className="text-muted-foreground">{row.breeder_name || '-'}</span>
                        <span className="font-medium">{row.total} บาท</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-3">
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
                  <TableHead>วันที่อนุมัติ</TableHead>
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
                    <TableCell>
                      {row.verified_at ? new Date(row.verified_at).toLocaleDateString('th-TH') : '-'}
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
