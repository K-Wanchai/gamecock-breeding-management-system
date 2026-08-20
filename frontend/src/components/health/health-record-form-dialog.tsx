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
import { ChickPicker } from '@/components/chicks/chick-picker'
import { useCreateHealthRecord } from '@/hooks/use-health-records'
import { toastApiError } from '@/lib/toast'
import type { Chick } from '@/types/chick'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface HealthRecordFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected when opened from a chick's own page — otherwise the admin picks one via ChickPicker. */
  chick?: Chick
}

export function HealthRecordFormDialog({ open, onOpenChange, chick }: HealthRecordFormDialogProps) {
  const [pickedChick, setPickedChick] = useState<Chick | null>(chick ?? null)
  const [recordDate, setRecordDate] = useState(todayStr())
  const [weight, setWeight] = useState('')
  const [symptom, setSymptom] = useState('')
  const [observation, setObservation] = useState('')
  const [medicine, setMedicine] = useState('')
  const [remark, setRemark] = useState('')

  const createHealthRecord = useCreateHealthRecord()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!pickedChick) {
      toast.error('กรุณาเลือกลูกไก่')
      return
    }
    createHealthRecord.mutate(
      {
        chick: pickedChick.id,
        record_date: recordDate,
        weight: weight || undefined,
        symptom: symptom || undefined,
        observation: observation || undefined,
        medicine: medicine || undefined,
        remark: remark || undefined,
      },
      {
        onSuccess: () => {
          toast.success('บันทึกข้อมูลสุขภาพแล้ว')
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
          <DialogTitle>บันทึกข้อมูลสุขภาพ</DialogTitle>
          <DialogDescription>บันทึกน้ำหนัก อาการ และการรักษารายตัว</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!chick && <ChickPicker value={pickedChick} onChange={setPickedChick} />}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="record_date">วันที่บันทึก</Label>
              <Input
                id="record_date"
                type="date"
                min={pickedChick?.birth_date}
                max={todayStr()}
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="weight">น้ำหนัก (กรัม, ถ้ามี)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="symptom">อาการที่พบ (ถ้ามี)</Label>
            <Textarea id="symptom" rows={2} value={symptom} onChange={(e) => setSymptom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observation">อาการ/ข้อสังเกต (ถ้ามี)</Label>
            <Textarea
              id="observation"
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="medicine">ยาที่ใช้ (ถ้ามี)</Label>
            <Textarea id="medicine" rows={2} value={medicine} onChange={(e) => setMedicine(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="health_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea id="health_remark" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createHealthRecord.isPending}>
              {createHealthRecord.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
