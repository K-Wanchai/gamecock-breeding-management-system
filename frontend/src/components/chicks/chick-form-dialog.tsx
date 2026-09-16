import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThaiDateInput } from '@/components/ui/thai-date-input'
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
import { useCreateChick } from '@/hooks/use-chicks'
import { toastApiError } from '@/lib/toast'
import { CHICK_GENDER_LABEL } from '@/types/chick'
import type { ChickGender } from '@/types/chick'
import type { Hatching } from '@/types/hatching'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface ChickFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hatching: Hatching
}

/** wing_clip_number is auto-generated server-side — never shown as an editable field here. */
export function ChickFormDialog({ open, onOpenChange, hatching }: ChickFormDialogProps) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState(todayStr())
  const [gender, setGender] = useState<ChickGender>('UNKNOWN')
  const [colorNote, setColorNote] = useState('')

  const createChick = useCreateChick()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    createChick.mutate(
      {
        hatching: hatching.id,
        name: name || undefined,
        birth_date: birthDate,
        gender,
        color_note: colorNote || undefined,
      },
      {
        onSuccess: (chick) => {
          toast.success(`เพิ่มลูกไก่ ${chick.wing_clip_number} แล้ว`)
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
          <DialogTitle>เพิ่มลูกไก่</DialogTitle>
          <DialogDescription>เลขปีกกิ๊ปจะถูกสร้างให้อัตโนมัติเมื่อบันทึก</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="chick_name">ชื่อ (ถ้ามี)</Label>
            <Input id="chick_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="birth_date">วันเกิด</Label>
              <ThaiDateInput
                id="birth_date"
                min={hatching.started_at}
                max={todayStr()}
                value={birthDate}
                onValueChange={setBirthDate}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gender">เพศ</Label>
              <Select value={gender} onValueChange={(value: ChickGender) => setGender(value)}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHICK_GENDER_LABEL) as ChickGender[]).map((g) => (
                    <SelectItem key={g} value={g}>
                      {CHICK_GENDER_LABEL[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="color_note">สีขน/ลักษณะเด่น (ถ้ามี)</Label>
            <Input id="color_note" value={colorNote} onChange={(e) => setColorNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createChick.isPending}>
              {createChick.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
