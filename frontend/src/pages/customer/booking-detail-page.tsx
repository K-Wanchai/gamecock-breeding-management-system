import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge'
import { PaymentStatusBadge, PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog'
import { BreedingTimeline } from '@/components/breeding/breeding-timeline'
import { EggHatchingSection } from '@/components/breeding/egg-hatching-section'
import { DocumentList } from '@/components/documents/document-list'
import { useBookingQuery, useCancelBooking } from '@/hooks/use-bookings'
import { usePaymentsQuery } from '@/hooks/use-payments'
import { useBreedingEventsQuery } from '@/hooks/use-breeding'
import { toastApiError } from '@/lib/toast'
import { CUSTOMER_CANCELLABLE_STATUSES } from '@/types/booking'

const NON_PAYABLE_STATUSES = ['CANCELLED', 'REJECTED', 'COMPLETED']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)
  const [cancelReason, setCancelReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const { data: booking, isLoading } = useBookingQuery(bookingId)
  const cancelBooking = useCancelBooking()
  const { data: payments } = usePaymentsQuery({ booking: bookingId })
  const { data: breedingEvents } = useBreedingEventsQuery({ booking: bookingId })

  if (isLoading || !booking) {
    return <SectionLoading />
  }

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status)
  const canPay =
    !NON_PAYABLE_STATUSES.includes(booking.status) && Number(booking.remaining_amount) > 0

  function handleConfirmCancel() {
    cancelBooking.mutate(
      { id: bookingId, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          toast.success('ยกเลิกการจองแล้ว')
          setConfirmOpen(false)
        },
        onError: (error) => {
          toastApiError(error)
          setConfirmOpen(false)
        },
      },
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/app/bookings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการจอง
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">การจอง {booking.booking_number}</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลการจอง</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow
            label="แม่ไก่"
            value={`${booking.hen.name}${booking.hen.breed ? ` (${booking.hen.breed})` : ''}`}
          />
          <InfoRow
            label="พ่อพันธุ์"
            value={`${booking.breeder.name}${booking.breeder.breed ? ` (${booking.breeder.breed})` : ''}`}
          />
          <InfoRow label="วันที่จอง" value={booking.booking_date} />
          {booking.queue_no !== null && <InfoRow label="หมายเลขคิว" value={booking.queue_no} />}
          {booking.note && <InfoRow label="หมายเหตุ" value={booking.note} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ค่าใช้จ่าย</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="ราคาทั้งหมด" value={`${booking.price} บาท`} />
          <InfoRow label="มัดจำที่ต้องชำระ" value={`${booking.deposit_amount} บาท`} />
          <InfoRow label="ชำระแล้ว" value={`${booking.paid_amount} บาท`} />
          <InfoRow label="คงเหลือ" value={`${booking.remaining_amount} บาท`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติการชำระเงิน</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {!payments || payments.results.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">ยังไม่มีการส่งหลักฐานการชำระเงิน</p>
          ) : (
            payments.results.map((payment) => (
              <div key={payment.id} className="flex flex-col gap-1 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {payment.payment_number} — {PAYMENT_TYPE_LABEL[payment.payment_type]}
                  </span>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{new Date(payment.paid_at).toLocaleString('th-TH')}</span>
                  <span>{payment.amount} บาท</span>
                </div>
                {payment.status === 'REJECTED' && payment.remark && (
                  <p className="text-destructive">เหตุผลที่ปฏิเสธ: {payment.remark}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ความคืบหน้าการผสมพันธุ์</CardTitle>
        </CardHeader>
        <CardContent>
          <BreedingTimeline events={breedingEvents?.results ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลไข่และการฟัก</CardTitle>
        </CardHeader>
        <CardContent>
          <EggHatchingSection bookingId={bookingId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList params={{ booking: bookingId }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติ</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow
            label="วันที่ขอจอง"
            value={new Date(booking.requested_at).toLocaleString('th-TH')}
          />
          {booking.approved_at && (
            <InfoRow
              label="วันที่อนุมัติ"
              value={new Date(booking.approved_at).toLocaleString('th-TH')}
            />
          )}
          {booking.cancelled_at && (
            <>
              <InfoRow
                label="วันที่ยกเลิก"
                value={new Date(booking.cancelled_at).toLocaleString('th-TH')}
              />
              {booking.cancel_reason && (
                <InfoRow label="เหตุผลที่ยกเลิก" value={booking.cancel_reason} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {canPay && <Button onClick={() => setPaymentDialogOpen(true)}>แนบสลิปชำระเงิน</Button>}
        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={cancelBooking.isPending}
          >
            ยกเลิกการจอง
          </Button>
        )}
      </div>

      {paymentDialogOpen && (
        <PaymentFormDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          booking={booking}
        />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยกเลิกการจองนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              การจอง {booking.booking_number} จะถูกยกเลิก การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel_reason">เหตุผล (ถ้ามี)</Label>
            <Textarea
              id="cancel_reason"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={cancelBooking.isPending}>
              ยืนยันยกเลิกการจอง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
