import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { PaymentStatusBadge, PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { useApprovePayment, usePaymentsQuery, useRejectPayment } from '@/hooks/use-payments'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toastApiError } from '@/lib/toast'
import type { Payment, PaymentStatus, PaymentType } from '@/types/payment'

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
  { value: 'DEPOSIT', label: 'มัดจำ' },
  { value: 'FULL', label: 'เต็มจำนวน' },
  { value: 'ADDITIONAL', label: 'ชำระเพิ่มเติม' },
]

export function AdminPaymentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL')
  const [paymentType, setPaymentType] = useState<PaymentType | 'ALL'>('ALL')
  const debouncedSearch = useDebouncedValue(search)

  const [slipPayment, setSlipPayment] = useState<Payment | null>(null)
  const [approvingPayment, setApprovingPayment] = useState<Payment | null>(null)
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null)
  const [remark, setRemark] = useState('')

  const { data, isLoading, isError, refetch } = usePaymentsQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    payment_type: paymentType === 'ALL' ? undefined : paymentType,
  })

  const approvePayment = useApprovePayment()
  const rejectPayment = useRejectPayment()

  function confirmApprove() {
    if (!approvingPayment) return
    approvePayment.mutate(
      { id: approvingPayment.id, remark: remark || undefined },
      {
        onSuccess: () => {
          toast.success(`อนุมัติการชำระเงิน ${approvingPayment.payment_number} แล้ว`)
          setApprovingPayment(null)
          setRemark('')
        },
        onError: (error) => {
          toastApiError(error)
          setApprovingPayment(null)
          setRemark('')
        },
      },
    )
  }

  function confirmReject() {
    if (!rejectingPayment) return
    rejectPayment.mutate(
      { id: rejectingPayment.id, remark: remark || undefined },
      {
        onSuccess: () => {
          toast.success(`ปฏิเสธการชำระเงิน ${rejectingPayment.payment_number} แล้ว`)
          setRejectingPayment(null)
          setRemark('')
        },
        onError: (error) => {
          toastApiError(error)
          setRejectingPayment(null)
          setRemark('')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">การชำระเงิน</h1>

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
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ไม่พบรายการชำระเงิน</p>
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
                  <TableHead>สลิป</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{payment.booking.booking_number}</TableCell>
                    <TableCell>{PAYMENT_TYPE_LABEL[payment.payment_type]}</TableCell>
                    <TableCell>{payment.amount} บาท</TableCell>
                    <TableCell>{new Date(payment.paid_at).toLocaleString('th-TH')}</TableCell>
                    <TableCell>
                      {payment.slip ? (
                        <Button variant="link" size="sm" onClick={() => setSlipPayment(payment)}>
                          ดูสลิป
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {payment.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setApprovingPayment(payment)}
                          >
                            อนุมัติ
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setRejectingPayment(payment)}
                          >
                            ปฏิเสธ
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      <Dialog open={Boolean(slipPayment)} onOpenChange={(open) => !open && setSlipPayment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>สลิปการชำระเงิน {slipPayment?.payment_number}</DialogTitle>
            <DialogDescription>
              {slipPayment && `${slipPayment.amount} บาท — ${new Date(slipPayment.paid_at).toLocaleString('th-TH')}`}
            </DialogDescription>
          </DialogHeader>
          {slipPayment?.slip && (
            <a href={slipPayment.slip} target="_blank" rel="noreferrer">
              <img
                src={slipPayment.slip}
                alt={`สลิปการชำระเงิน ${slipPayment.payment_number}`}
                className="w-full rounded-md border object-contain"
              />
            </a>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(approvingPayment)}
        onOpenChange={(open) => {
          if (!open) {
            setApprovingPayment(null)
            setRemark('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>อนุมัติการชำระเงินนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              การชำระเงิน {approvingPayment?.payment_number} จำนวน {approvingPayment?.amount} บาท
              จะถูกอนุมัติและนับเข้ายอดชำระของการจอง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="approve_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="approve_remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={approvePayment.isPending}>
              ยืนยันอนุมัติ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(rejectingPayment)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingPayment(null)
            setRemark('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธการชำระเงินนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              การชำระเงิน {rejectingPayment?.payment_number} จะถูกปฏิเสธ กรุณาระบุเหตุผลให้ลูกค้าทราบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject_remark">เหตุผล</Label>
            <Textarea
              id="reject_remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject} disabled={rejectPayment.isPending}>
              ยืนยันปฏิเสธ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
