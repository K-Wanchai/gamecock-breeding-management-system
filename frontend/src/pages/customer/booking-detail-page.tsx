import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { PaymentStatusBadge, PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog'
import { PromptPayQR } from '@/components/payments/promptpay-qr'
import { DocumentList } from '@/components/documents/document-list'
import { useBookingQuery, useCancelBooking } from '@/hooks/use-bookings'
import { usePaymentsQuery, useResubmitPayment } from '@/hooks/use-payments'
import { useFarmSettingQuery } from '@/hooks/use-settings'
import { toastApiError } from '@/lib/toast'
import { formatThaiDate, formatThaiDateTime } from '@/lib/utils'
import { validateImageFile } from '@/lib/validate-image-file'
import { CUSTOMER_CANCELLABLE_STATUSES, type BookingStatus } from '@/types/booking'
import type { FarmSetting } from '@/lib/api/settings'
import type { Payment } from '@/types/payment'

/* ─── Utility components ───────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/* ─── Booking Steps ────────────────────────────────────────────────────── */

const STEPS: { status: BookingStatus[]; label: string }[] = [
  { status: ['PENDING'], label: 'จอง' },
  { status: ['WAITING_PAYMENT'], label: 'รอชำระเงิน' },
  { status: ['PAID'], label: 'ชำระแล้ว' },
  { status: ['APPROVED'], label: 'อนุมัติ' },
  { status: ['IN_PROGRESS'], label: 'ผสมพันธุ์' },
  { status: ['COMPLETED'], label: 'เสร็จสิ้น' },
]

const STATUS_STEP_INDEX: Record<BookingStatus, number> = {
  PENDING: 0,
  WAITING_PAYMENT: 1,
  PAID: 2,
  APPROVED: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  CANCELLED: -1,
  REJECTED: -1,
}

function BookingSteps({ status }: { status: BookingStatus }) {
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-destructive/10 p-3">
        <Badge variant="destructive" className="text-sm">
          {status === 'CANCELLED' ? 'ยกเลิกแล้ว' : 'ปฏิเสธแล้ว'}
        </Badge>
      </div>
    )
  }
  const current = STATUS_STEP_INDEX[status]
  return (
    <div className="flex items-center overflow-x-auto rounded-lg border bg-card p-3 gap-0">
      {STEPS.map((step, idx) => {
        const done = idx < current
        const active = idx === current
        return (
          <div key={idx} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={[
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2',
                  done ? 'bg-primary border-primary text-primary-foreground' : '',
                  active ? 'bg-primary/10 border-primary text-primary' : '',
                  !done && !active ? 'border-muted-foreground/30 text-muted-foreground' : '',
                ].join(' ')}
              >
                {done ? <Check className="size-3.5" /> : idx + 1}
              </div>
              <span className={['text-[10px] font-medium text-center leading-tight',
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'].join(' ')}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={['h-0.5 flex-1 mx-1 mb-4 rounded', done ? 'bg-primary' : 'bg-muted'].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Payment Info Card ────────────────────────────────────────────────── */

function PaymentInfoCard({ amount, farm }: { amount: string; farm: FarmSetting }) {
  const amountNum = Number(amount)
  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-800 dark:text-amber-200">
          โอนเงินเพื่อยืนยันการจอง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {farm.promptpay && (
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <PromptPayQR phone={farm.promptpay} amount={amountNum} size={180} />
              <p className="text-xs text-muted-foreground text-center">สแกนด้วยแอปธนาคาร</p>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3 text-sm">
            <div className="rounded-lg bg-white dark:bg-background p-3 border">
              <p className="text-xs text-muted-foreground mb-1">ยอดที่ต้องชำระ</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                ฿{amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                <CopyButton text={amountNum.toFixed(2)} />
              </p>
            </div>

            <div className="rounded-lg bg-white dark:bg-background border divide-y text-sm">
              {farm.bank_name && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-muted-foreground">ธนาคาร</span>
                  <span className="font-medium">{farm.bank_name}</span>
                </div>
              )}
              {farm.account_number && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-muted-foreground">เลขบัญชี</span>
                  <span className="font-medium flex items-center">
                    {farm.account_number}
                    <CopyButton text={farm.account_number.replace(/-/g, '')} />
                  </span>
                </div>
              )}
              {farm.account_holder && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-muted-foreground">ชื่อบัญชี</span>
                  <span className="font-medium">{farm.account_holder}</span>
                </div>
              )}
              {farm.promptpay && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-muted-foreground">PromptPay</span>
                  <span className="font-medium flex items-center">
                    {farm.promptpay}
                    <CopyButton text={farm.promptpay} />
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              โอนแล้ว กด <strong>"แนบสลิปชำระเงิน"</strong> ด้านล่าง — เจ้าหน้าที่จะตรวจสอบภายใน 24 ชั่วโมง
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Resubmit Slip Dialog ─────────────────────────────────────────────── */

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function ResubmitSlipDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: Payment
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [slip, setSlip] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState(nowLocal)
  const fileRef = useRef<HTMLInputElement>(null)
  const resubmit = useResubmitPayment()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) {
      const err = validateImageFile(file)
      if (err) { toast.error(err); e.target.value = ''; return }
    }
    setSlip(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!slip) { toast.error('กรุณาเลือกรูปสลิป'); return }
    resubmit.mutate(
      { id: payment.id, slip, paidAt },
      {
        onSuccess: () => {
          toast.success(`ส่งสลิปใหม่สำหรับ ${payment.payment_number} แล้ว`)
          onOpenChange(false)
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>แก้ไขสลิปการโอนเงิน</DialogTitle>
          <DialogDescription>
            {payment.payment_number} — รหัสไม่เปลี่ยน เฉพาะสลิปและวันที่โอนเท่านั้น
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-36 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted hover:bg-muted/70 transition-colors"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="size-8" />
                <span className="text-sm">คลิกเพื่อเลือกรูปสลิป</span>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="resubmit_paid_at">วันเวลาที่โอน</Label>
            <Input
              id="resubmit_paid_at"
              type="datetime-local"
              max={nowLocal()}
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={resubmit.isPending || !slip}>
              {resubmit.isPending ? 'กำลังส่ง...' : 'ส่งสลิปใหม่'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Payment History ──────────────────────────────────────────────────── */

function PaymentHistoryCard({ bookingId }: { bookingId: number }) {
  const { data: payments } = usePaymentsQuery({ booking: bookingId })
  const [resubmitTarget, setResubmitTarget] = useState<Payment | null>(null)

  if (!payments || payments.results.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">ประวัติการชำระเงิน</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ยังไม่มีการส่งหลักฐาน</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">ประวัติการชำระเงิน</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {payments.results.map((p) => (
          <div key={p.id} className="rounded-lg border p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{p.payment_number}</p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_TYPE_LABEL[p.payment_type]} · {formatThaiDateTime(p.paid_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <PaymentStatusBadge status={p.status} />
                <span className="text-sm font-bold">฿{Number(p.amount).toLocaleString('th-TH')}</span>
              </div>
            </div>
            {p.status === 'REJECTED' && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <p className="font-medium">ปฏิเสธ{p.remark ? `: ${p.remark}` : ''}</p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-2 h-7 text-xs"
                  onClick={() => setResubmitTarget(p)}
                >
                  แก้ไขสลิป
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      {resubmitTarget && (
        <ResubmitSlipDialog
          payment={resubmitTarget}
          open={Boolean(resubmitTarget)}
          onOpenChange={(v) => !v && setResubmitTarget(null)}
        />
      )}
    </Card>
  )
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const cancelBooking = useCancelBooking()
  const { data: farmSetting } = useFarmSettingQuery()

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status)
  const canPay = !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(booking.status) && Number(booking.remaining_amount) > 0

  function handleConfirmCancel() {
    cancelBooking.mutate(
      { id: bookingId, reason: cancelReason || undefined },
      {
        onSuccess: () => { toast.success('ยกเลิกการจองแล้ว'); setConfirmOpen(false) },
        onError: (err) => { toastApiError(err); setConfirmOpen(false) },
      },
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link to="/app/bookings" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปรายการจอง
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{booking.booking_number}</h1>
          {booking.queue_no !== null && (
            <p className="text-sm text-muted-foreground">คิวที่ {booking.queue_no}</p>
          )}
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Steps */}
      <BookingSteps status={booking.status} />

      {/* Booking info */}
      <Card>
        <CardHeader><CardTitle className="text-base">ข้อมูลการจอง</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="แม่ไก่" value={`${booking.hen.name}${booking.hen.breed ? ` (${booking.hen.breed})` : ''}`} />
          <InfoRow label="พ่อพันธุ์" value={`${booking.breeder.name}${booking.breeder.breed ? ` (${booking.breeder.breed})` : ''}`} />
          <InfoRow label="วันที่จอง" value={formatThaiDate(booking.booking_date)} />
          <InfoRow label="ราคา" value={`฿${Number(booking.price).toLocaleString('th-TH')}`} />
          {booking.note && <InfoRow label="หมายเหตุ" value={booking.note} />}
        </CardContent>
      </Card>

      {/* Payment info card — shown only when awaiting payment */}
      {booking.status === 'WAITING_PAYMENT' && farmSetting && (
        <PaymentInfoCard amount={booking.remaining_amount} farm={farmSetting} />
      )}

      {/* Payment history */}
      <PaymentHistoryCard bookingId={bookingId} />

      {/* Financial summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">สรุปการเงิน</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="ราคา" value={`฿${Number(booking.price).toLocaleString('th-TH')}`} />
          <InfoRow label="ชำระแล้ว" value={`฿${Number(booking.paid_amount).toLocaleString('th-TH')}`} />
          <InfoRow
            label="คงเหลือ"
            value={
              <span className={Number(booking.remaining_amount) > 0 ? 'text-destructive font-bold' : 'text-green-600'}>
                ฿{Number(booking.remaining_amount).toLocaleString('th-TH')}
              </span>
            }
          />
        </CardContent>
      </Card>

      {/* Link to dedicated breeding timeline page */}
      {['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">บันทึกไทม์ไลน์การฝากผสมและการออกไข่</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">ติดตามความคืบหน้าการผสมพันธุ์และการออกไข่</p>
            </div>
            <Link
              to={`/app/breeding-timeline/${bookingId}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              ดูไทม์ไลน์
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">เอกสาร</CardTitle></CardHeader>
        <CardContent>
          <DocumentList params={{ booking: bookingId }} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canPay && (
          <Button onClick={() => setPaymentDialogOpen(true)}>
            แนบสลิปชำระเงิน
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setConfirmOpen(true)} disabled={cancelBooking.isPending}>
            ยกเลิกการจอง
          </Button>
        )}
      </div>

      {paymentDialogOpen && (
        <PaymentFormDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} booking={booking} />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันยกเลิกการจอง?</AlertDialogTitle>
            <AlertDialogDescription>
              การจอง {booking.booking_number} จะถูกยกเลิก การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel_reason">เหตุผล (ถ้ามี)</Label>
            <Textarea id="cancel_reason" rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={cancelBooking.isPending}>
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
