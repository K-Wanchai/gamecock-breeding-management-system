import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThaiDateInput } from '@/components/ui/thai-date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateBreedingEvent } from '@/hooks/use-breeding'
import { toastApiError } from '@/lib/toast'
import { BREEDING_EVENT_LABEL } from '@/types/breeding'
import type { BreedingEventStatus } from '@/types/breeding'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface BreedingEventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: number
  /** The single allowed next stage — computed from the existing timeline, never chosen freely (mirrors apps.breeding.services.BREEDING_TRANSITIONS). */
  nextStatus: BreedingEventStatus
}

export function BreedingEventFormDialog({
  open,
  onOpenChange,
  bookingId,
  nextStatus,
}: BreedingEventFormDialogProps) {
  const [eventDate, setEventDate] = useState(todayStr())
  const [description, setDescription] = useState('')

  const createEvent = useCreateBreedingEvent()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    createEvent.mutate(
      { booking: bookingId, status: nextStatus, event_date: eventDate, description: description || undefined },
      {
        onSuccess: () => {
          toast.success(`บันทึกสถานะ "${BREEDING_EVENT_LABEL[nextStatus]}" แล้ว`)
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
          <DialogTitle>บันทึกความคืบหน้าการผสมพันธุ์</DialogTitle>
          <DialogDescription>บันทึกได้เฉพาะขั้นตอนถัดไปตามลำดับเท่านั้น</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>สถานะที่จะบันทึก</Label>
            <Input value={BREEDING_EVENT_LABEL[nextStatus]} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="event_date">วันที่</Label>
            <ThaiDateInput
              id="event_date"
              max={todayStr()}
              value={eventDate}
              onValueChange={setEventDate}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
