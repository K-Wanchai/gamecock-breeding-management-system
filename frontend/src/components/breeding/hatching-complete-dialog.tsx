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
import { useCompleteHatching } from '@/hooks/use-hatchings'
import { toastApiError } from '@/lib/toast'
import type { Hatching } from '@/types/hatching'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface HatchingCompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hatching: Hatching
}

export function HatchingCompleteDialog({ open, onOpenChange, hatching }: HatchingCompleteDialogProps) {
  const [completedAt, setCompletedAt] = useState(todayStr())
  const [hatchedCount, setHatchedCount] = useState('0')
  const [failedCount, setFailedCount] = useState('0')
  const [survivalCount, setSurvivalCount] = useState('0')
  const [remark, setRemark] = useState('')

  const completeHatching = useCompleteHatching()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (Number(hatchedCount) + Number(failedCount) > hatching.total_eggs) {
      toast.error('ฟักออก + ฟักไม่สำเร็จ ต้องไม่เกินจำนวนไข่ทั้งหมดที่เข้าฟัก')
      return
    }
    if (Number(survivalCount) > Number(hatchedCount)) {
      toast.error('จำนวนที่รอดชีวิตต้องไม่เกินจำนวนที่ฟักออก')
      return
    }
    completeHatching.mutate(
      {
        id: hatching.id,
        payload: {
          completed_at: completedAt,
          hatched_count: Number(hatchedCount),
          failed_count: Number(failedCount),
          survival_count: Number(survivalCount),
          remark: remark || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('บันทึกผลการฟักแล้ว')
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
          <DialogTitle>บันทึกผลการฟักไข่</DialogTitle>
          <DialogDescription>ไข่ที่เข้าฟักทั้งหมด {hatching.total_eggs} ฟอง</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hatched_count">ฟักออก (ตัว)</Label>
              <Input
                id="hatched_count"
                type="number"
                min="0"
                max={hatching.total_eggs}
                value={hatchedCount}
                onChange={(e) => setHatchedCount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="failed_count">ฟักไม่สำเร็จ (ฟอง)</Label>
              <Input
                id="failed_count"
                type="number"
                min="0"
                max={hatching.total_eggs}
                value={failedCount}
                onChange={(e) => setFailedCount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="survival_count">รอดชีวิต (ตัว)</Label>
            <Input
              id="survival_count"
              type="number"
              min="0"
              max={hatchedCount}
              value={survivalCount}
              onChange={(e) => setSurvivalCount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="completed_at">วันที่ฟักเสร็จสิ้น</Label>
            <ThaiDateInput
              id="completed_at"
              min={hatching.started_at}
              max={todayStr()}
              value={completedAt}
              onValueChange={setCompletedAt}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="complete_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="complete_remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={completeHatching.isPending}>
              {completeHatching.isPending ? 'กำลังบันทึก...' : 'บันทึกผล'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
