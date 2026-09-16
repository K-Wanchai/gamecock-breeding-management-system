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
import { useCreateEgg } from '@/hooks/use-breeding'
import { toastApiError } from '@/lib/toast'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface EggFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: number
}

export function EggFormDialog({ open, onOpenChange, bookingId }: EggFormDialogProps) {
  const [totalEggs, setTotalEggs] = useState('0')
  const [badEggs, setBadEggs] = useState('0')
  const [eggDate, setEggDate] = useState(todayStr())
  const [remark, setRemark] = useState('')

  const createEgg = useCreateEgg()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const total = Number(totalEggs)
    const bad = Number(badEggs)
    if (bad > total) {
      toast.error('ไข่เสียต้องไม่มากกว่าจำนวนไข่ทั้งหมด')
      return
    }
    createEgg.mutate(
      {
        booking: bookingId,
        total_eggs: total,
        good_eggs: Math.max(0, total - bad),
        bad_eggs: bad,
        egg_date: eggDate,
        remark: remark || undefined,
      },
      {
        onSuccess: () => {
          toast.success('บันทึกข้อมูลไข่แล้ว')
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
          <DialogTitle>บันทึกข้อมูลไข่</DialogTitle>
          <DialogDescription>บันทึกจำนวนไข่ที่พบในวันนี้</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="egg_date">วันที่ออกไข่</Label>
            <ThaiDateInput
              id="egg_date"
              max={todayStr()}
              value={eggDate}
              onValueChange={setEggDate}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="total_eggs">จำนวนไข่วันนี้ (ฟอง)</Label>
            <Input
              id="total_eggs"
              type="number"
              min="0"
              value={totalEggs}
              onChange={(e) => setTotalEggs(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bad_eggs">ไข่เสีย / แตก (ฟอง)</Label>
            <Input
              id="bad_eggs"
              type="number"
              min="0"
              max={totalEggs}
              value={badEggs}
              onChange={(e) => setBadEggs(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="egg_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea id="egg_remark" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createEgg.isPending}>
              {createEgg.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
