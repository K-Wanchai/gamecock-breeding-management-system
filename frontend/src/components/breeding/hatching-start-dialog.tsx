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
import { useStartHatching } from '@/hooks/use-hatchings'
import { toastApiError } from '@/lib/toast'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface HatchingStartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eggId: number
}

export function HatchingStartDialog({ open, onOpenChange, eggId }: HatchingStartDialogProps) {
  const [startedAt, setStartedAt] = useState(todayStr())
  const [remark, setRemark] = useState('')

  const startHatching = useStartHatching()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    startHatching.mutate(
      { egg: eggId, started_at: startedAt, remark: remark || undefined },
      {
        onSuccess: () => {
          toast.success('เริ่มการฟักไข่แล้ว')
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
          <DialogTitle>เริ่มการฟักไข่</DialogTitle>
          <DialogDescription>จำนวนไข่ที่เข้าฟักจะดึงจากจำนวนไข่ทั้งหมดของชุดนี้โดยอัตโนมัติ</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="started_at">วันที่เริ่มฟัก</Label>
            <ThaiDateInput
              id="started_at"
              max={todayStr()}
              value={startedAt}
              onValueChange={setStartedAt}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hatching_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="hatching_remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={startHatching.isPending}>
              {startHatching.isPending ? 'กำลังบันทึก...' : 'เริ่มการฟัก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
