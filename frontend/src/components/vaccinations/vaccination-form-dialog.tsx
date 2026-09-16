import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThaiDateInput } from '@/components/ui/thai-date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChickPicker } from '@/components/chicks/chick-picker'
import { useCreateVaccination, useVaccinePresetsQuery } from '@/hooks/use-vaccinations'
import { toastApiError } from '@/lib/toast'
import type { Chick } from '@/types/chick'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface VaccinationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected when opened from a chick's own page — otherwise the admin picks one via ChickPicker. */
  chick?: Chick
}

/** age_days is never entered here — the server computes it from vaccination_date - chick.birth_date. */
export function VaccinationFormDialog({ open, onOpenChange, chick }: VaccinationFormDialogProps) {
  const [pickedChick, setPickedChick] = useState<Chick | null>(chick ?? null)
  const [vaccineName, setVaccineName] = useState('')
  const [vaccinationDate, setVaccinationDate] = useState(todayStr())
  const [doseNumber, setDoseNumber] = useState('1')
  const [remark, setRemark] = useState('')

  const createVaccination = useCreateVaccination()
  const { data: presets } = useVaccinePresetsQuery()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!pickedChick) {
      toast.error('กรุณาเลือกลูกไก่')
      return
    }
    createVaccination.mutate(
      {
        chick: pickedChick.id,
        vaccine_name: vaccineName,
        vaccination_date: vaccinationDate,
        dose_number: Number(doseNumber),
        remark: remark || undefined,
      },
      {
        onSuccess: () => {
          toast.success('บันทึกการฉีดวัคซีนแล้ว')
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
          <DialogTitle>บันทึกการฉีดวัคซีน</DialogTitle>
          <DialogDescription>วัคซีนแต่ละชนิด/เข็มบันทึกซ้ำกับลูกไก่ตัวเดิมไม่ได้</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!chick && <ChickPicker value={pickedChick} onChange={setPickedChick} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="vaccine_name">ชื่อวัคซีน</Label>
            {presets && presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <Badge
                    key={p.id}
                    variant={vaccineName === p.name ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => setVaccineName(p.name)}
                  >
                    {p.name}
                  </Badge>
                ))}
              </div>
            )}
            <Input
              id="vaccine_name"
              placeholder="หรือพิมพ์ชื่อวัคซีนเอง"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dose_number">เข็มที่</Label>
              <Input
                id="dose_number"
                type="number"
                min="1"
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vaccination_date">วันที่ฉีด</Label>
              <ThaiDateInput
                id="vaccination_date"
                min={pickedChick?.birth_date}
                max={todayStr()}
                value={vaccinationDate}
                onValueChange={setVaccinationDate}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vaccination_remark">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="vaccination_remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createVaccination.isPending}>
              {createVaccination.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
