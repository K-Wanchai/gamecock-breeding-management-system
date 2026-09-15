import { useRef, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreatePayment } from '@/hooks/use-payments'
import { PAYMENT_TYPE_LABEL } from '@/components/payments/payment-status-badge'
import { toastApiError } from '@/lib/toast'
import { validateImageFile } from '@/lib/validate-image-file'
import type { Booking } from '@/types/booking'
import type { PaymentFormValues, PaymentType } from '@/types/payment'

function nowLocal(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm for <input type="datetime-local">
}

function defaultValuesFor(booking: Booking): PaymentFormValues {
  return {
    payment_type: 'FULL',
    amount: booking.remaining_amount,
    paid_at: nowLocal(),
    slip: null,
  }
}

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking
}

/** Rendered only while `open` is true (see caller — mounted via `{open && <PaymentFormDialog key=.../>}`). */
export function PaymentFormDialog({ open, onOpenChange, booking }: PaymentFormDialogProps) {
  const [form, setForm] = useState<PaymentFormValues>(() => defaultValuesFor(booking))
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createPayment = useCreatePayment()

  function handleSlipChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file) {
      const error = validateImageFile(file)
      if (error) {
        toast.error(error)
        event.target.value = ''
        return
      }
    }
    setForm((prev) => ({ ...prev, slip: file }))
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.slip) {
      toast.error('กรุณาแนบรูปสลิปการโอนเงิน')
      return
    }
    createPayment.mutate(
      { bookingId: booking.id, values: form },
      {
        onSuccess: () => {
          toast.success('ส่งหลักฐานการชำระเงินสำเร็จ', { description: 'รอเจ้าหน้าที่ตรวจสอบ' })
          onOpenChange(false)
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>แนบสลิปชำระเงิน</DialogTitle>
          <DialogDescription>
            การจอง {booking.booking_number} — ยอดคงเหลือ {booking.remaining_amount} บาท
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
            </button>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                เลือกรูปสลิป
              </Button>
              <p className="text-xs text-muted-foreground">.jpg .jpeg .png .webp ไม่เกิน 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleSlipChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_type">ประเภทการชำระเงิน</Label>
            <Select
              value={form.payment_type}
              onValueChange={(value: PaymentType) =>
                setForm((prev) => ({ ...prev, payment_type: value }))
              }
            >
              <SelectTrigger id="payment_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_TYPE_LABEL) as PaymentType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {PAYMENT_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={booking.remaining_amount}
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="paid_at">วันเวลาที่โอน</Label>
              <Input
                id="paid_at"
                type="datetime-local"
                max={nowLocal()}
                value={form.paid_at}
                onChange={(e) => setForm((prev) => ({ ...prev, paid_at: e.target.value }))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'กำลังส่ง...' : 'ส่งหลักฐานการชำระเงิน'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
