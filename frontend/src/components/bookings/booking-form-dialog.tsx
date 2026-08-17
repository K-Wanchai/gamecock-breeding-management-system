import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useHensQuery } from '@/hooks/use-hens'
import { useCreateBooking } from '@/hooks/use-bookings'
import { toastApiError } from '@/lib/toast'
import type { Breeder } from '@/types/breeder'

function today(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time, matches DRF DateField format
}

interface BookingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breeder: Breeder
}

export function BookingFormDialog({ open, onOpenChange, breeder }: BookingFormDialogProps) {
  const [henId, setHenId] = useState('')
  const [bookingDate, setBookingDate] = useState(today())
  const [note, setNote] = useState('')
  const navigate = useNavigate()

  const { data: hensData, isLoading: hensLoading } = useHensQuery({ status: 'ACTIVE' })
  const createBooking = useCreateBooking()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!henId) return
    createBooking.mutate(
      {
        hen: Number(henId),
        breeder: breeder.id,
        booking_date: bookingDate,
        note: note || undefined,
      },
      {
        onSuccess: (booking) => {
          toast.success('จองคิวสำเร็จ', {
            description: `ราคา ${booking.price} บาท มัดจำ ${booking.deposit_amount} บาท`,
          })
          onOpenChange(false)
          navigate(`/app/bookings/${booking.id}`)
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>จองคิวกับ {breeder.name}</DialogTitle>
          <DialogDescription>
            ราคาค่าบริการ {breeder.service_rate} บาท — ระบบจะคำนวณราคาและมัดจำให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hen">แม่ไก่ที่จะใช้จอง</Label>
            <Select value={henId} onValueChange={setHenId}>
              <SelectTrigger id="hen" className="w-full">
                <SelectValue placeholder={hensLoading ? 'กำลังโหลด...' : 'เลือกแม่ไก่'} />
              </SelectTrigger>
              <SelectContent>
                {hensData?.results.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    ไม่มีแม่ไก่ที่ใช้งานได้ — เพิ่มแม่ไก่ก่อน
                  </div>
                )}
                {hensData?.results.map((hen) => (
                  <SelectItem key={hen.id} value={String(hen.id)}>
                    {hen.name} {hen.breed ? `(${hen.breed})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="booking_date">วันที่ต้องการจอง</Label>
            <Input
              id="booking_date"
              type="date"
              min={today()}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">หมายเหตุ (ถ้ามี)</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createBooking.isPending || !henId}>
              {createBooking.isPending ? 'กำลังจอง...' : 'ยืนยันการจอง'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
