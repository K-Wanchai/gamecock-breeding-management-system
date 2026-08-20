import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [goodEggs, setGoodEggs] = useState('0')
  const [badEggs, setBadEggs] = useState('0')
  const [eggDate, setEggDate] = useState(todayStr())
  const [incubationDate, setIncubationDate] = useState('')
  const [remark, setRemark] = useState('')

  const createEgg = useCreateEgg()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (Number(goodEggs) + Number(badEggs) > Number(totalEggs)) {
      toast.error('จำนวนไข่ดี + ไข่เสีย ต้องไม่เกินจำนวนไข่ทั้งหมด')
      return
    }
    createEgg.mutate(
      {
        booking: bookingId,
        total_eggs: Number(totalEggs),
        good_eggs: Number(goodEggs),
        bad_eggs: Number(badEggs),
        egg_date: eggDate,
        incubation_date: incubationDate || undefined,
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
          <DialogDescription>บันทึกจำนวนไข่ที่ออกในรอบนี้</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="total_eggs">จำนวนไข่ทั้งหมด</Label>
            <Input
              id="total_eggs"
              type="number"
              min="0"
              value={totalEggs}
              onChange={(e) => setTotalEggs(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="good_eggs">ไข่ดี</Label>
              <Input
                id="good_eggs"
                type="number"
                min="0"
                value={goodEggs}
                onChange={(e) => setGoodEggs(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bad_eggs">ไข่เสีย</Label>
              <Input
                id="bad_eggs"
                type="number"
                min="0"
                value={badEggs}
                onChange={(e) => setBadEggs(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="egg_date">วันที่ออกไข่</Label>
              <Input
                id="egg_date"
                type="date"
                max={todayStr()}
                value={eggDate}
                onChange={(e) => setEggDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="incubation_date">วันที่เข้าตู้ฟัก (ถ้ามี)</Label>
              <Input
                id="incubation_date"
                type="date"
                min={eggDate}
                value={incubationDate}
                onChange={(e) => setIncubationDate(e.target.value)}
              />
            </div>
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
