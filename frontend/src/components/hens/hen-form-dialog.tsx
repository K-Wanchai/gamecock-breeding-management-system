import { useRef, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useCreateHen, useUpdateHen } from '@/hooks/use-hens'
import { toastApiError } from '@/lib/toast'
import { toast } from 'sonner'
import type { Hen, HenFormValues } from '@/types/hen'

const EMPTY_FORM: HenFormValues = {
  name: '',
  breed: '',
  bloodline: '',
  age_months: '',
  history: '',
  status: 'ACTIVE',
  image: null,
}

function formValuesFromHen(hen: Hen): HenFormValues {
  return {
    name: hen.name,
    breed: hen.breed ?? '',
    bloodline: hen.bloodline ?? '',
    age_months: hen.age_months?.toString() ?? '',
    history: hen.history ?? '',
    status: hen.status,
    image: null,
  }
}

interface HenFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hen?: Hen
}

/**
 * Rendered only while `open` is true (see HensPage — mounted via `{formOpen && <HenFormDialog key=.../>}`),
 * so the lazy useState initializers below are enough to seed fresh form values per open; no effect needed.
 */
export function HenFormDialog({ open, onOpenChange, hen }: HenFormDialogProps) {
  const isEdit = Boolean(hen)
  const [form, setForm] = useState<HenFormValues>(() => (hen ? formValuesFromHen(hen) : EMPTY_FORM))
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => hen?.image ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createHen = useCreateHen()
  const updateHen = useUpdateHen()
  const isPending = createHen.isPending || updateHen.isPending

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, image: file }))
    setPreviewUrl(file ? URL.createObjectURL(file) : (hen?.image ?? null))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const onSuccess = () => {
      toast.success(isEdit ? 'บันทึกข้อมูลแม่ไก่สำเร็จ' : 'เพิ่มแม่ไก่สำเร็จ')
      onOpenChange(false)
    }
    if (isEdit && hen) {
      updateHen.mutate({ id: hen.id, values: form }, { onSuccess, onError: toastApiError })
    } else {
      createHen.mutate(form, { onSuccess, onError: toastApiError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขข้อมูลแม่ไก่' : 'เพิ่มแม่ไก่ใหม่'}</DialogTitle>
          <DialogDescription>
            รองรับไฟล์รูปภาพ .jpg .jpeg .png .webp ขนาดไม่เกิน 5MB
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
                เลือกรูปภาพ
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">ชื่อ</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="breed">สายพันธุ์</Label>
              <Input
                id="breed"
                value={form.breed}
                onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="age_months">อายุ (เดือน)</Label>
              <Input
                id="age_months"
                type="number"
                min={0}
                value={form.age_months}
                onChange={(e) => setForm((prev) => ({ ...prev, age_months: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bloodline">สายเลือด</Label>
            <Textarea
              id="bloodline"
              rows={2}
              value={form.bloodline}
              onChange={(e) => setForm((prev) => ({ ...prev, bloodline: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="history">ประวัติ</Label>
            <Textarea
              id="history"
              rows={2}
              value={form.history}
              onChange={(e) => setForm((prev) => ({ ...prev, history: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">สถานะ</Label>
            <Select
              value={form.status}
              onValueChange={(value: Hen['status']) =>
                setForm((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ใช้งาน (ACTIVE)</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน (INACTIVE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
