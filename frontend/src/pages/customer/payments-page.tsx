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
import { PaymentStatusBadge, PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { usePaymentsQuery } from '@/hooks/use-payments'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { PaymentStatus } from '@/types/payment'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'PENDING', label: 'รอตรวจสอบ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

export function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = usePaymentsQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">การชำระเงินของฉัน</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหาเลขที่ชำระเงิน, เลขที่จอง..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value: PaymentStatus | 'ALL') => {
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
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีการชำระเงิน</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ชำระเงิน</TableHead>
                  <TableHead>การจอง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>วันที่โอน</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>
                      <Link
                        to={`/app/bookings/${payment.booking.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {payment.booking.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>{PAYMENT_TYPE_LABEL[payment.payment_type]}</TableCell>
                    <TableCell>{payment.amount} บาท</TableCell>
                    <TableCell>{new Date(payment.paid_at).toLocaleString('th-TH')}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
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
