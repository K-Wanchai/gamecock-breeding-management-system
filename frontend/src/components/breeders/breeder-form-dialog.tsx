import { useRef, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
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
import { useCreateBreeder, useUpdateBreeder } from '@/hooks/use-breeders'
import { toastApiError } from '@/lib/toast'
import type { Breeder, BreederFormValues } from '@/types/breeder'

const EMPTY_FORM: BreederFormValues = {
  name: '',
  breed: '',
  bloodline: '',
  description: '',
  service_rate: '',
  default_monthly_quota: '0',
  status: 'ACTIVE',
  service_start_date: '',
  image: null,
}

function formValuesFromBreeder(breeder: Breeder): BreederFormValues {
  return {
    name: breeder.name,
    breed: breeder.breed ?? '',
    bloodline: breeder.bloodline ?? '',
    description: breeder.description ?? '',
    service_rate: breeder.service_rate,
    default_monthly_quota: String(breeder.default_monthly_quota),
    status: breeder.status,
    service_start_date: breeder.service_start_date ?? '',
    image: null,
  }
}

interface BreederFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breeder?: Breeder
}

/** Rendered only while `open` is true — see BreedersPage, mounted via `{formOpen && <BreederFormDialog key=.../>}`. */
export function BreederFormDialog({ open, onOpenChange, breeder }: BreederFormDialogProps) {
  const isEdit = Boolean(breeder)
  const [form, setForm] = useState<BreederFormValues>(() =>
    breeder ? formValuesFromBreeder(breeder) : EMPTY_FORM,
  )
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => breeder?.image ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createBreeder = useCreateBreeder()
  const updateBreeder = useUpdateBreeder()
  const isPending = createBreeder.isPending || updateBreeder.isPending

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, image: file }))
    setPreviewUrl(file ? URL.createObjectURL(file) : (breeder?.image ?? null))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const onSuccess = () => {
      toast.success(isEdit ? 'บันทึกข้อมูลพ่อพันธุ์สำเร็จ' : 'เพิ่มพ่อพันธุ์สำเร็จ')
      onOpenChange(false)
    }
    if (isEdit && breeder) {
      updateBreeder.mutate({ id: breeder.id, values: form }, { onSuccess, onError: toastApiError })
    } else {
      createBreeder.mutate(form, { onSuccess, onError: toastApiError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขข้อมูลพ่อพันธุ์' : 'เพิ่มพ่อพันธุ์ใหม่'}</DialogTitle>
          <DialogDescription>
            รองรับไฟล์รูปภาพ .jpg .jpeg .png .webp ขนาดไม่เกิน 5MB
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
        >
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="breed">สายพันธุ์</Label>
            <Input
              id="breed"
              value={form.breed}
              onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="service_rate">ราคาค่าบริการ (บาท)</Label>
              <Input
                id="service_rate"
                type="number"
                step="0.01"
                min="0"
                value={form.service_rate}
                onChange={(e) => setForm((prev) => ({ ...prev, service_rate: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="default_monthly_quota">โควตา/เดือน (ค่าเริ่มต้น)</Label>
              <Input
                id="default_monthly_quota"
                type="number"
                min="0"
                value={form.default_monthly_quota}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, default_monthly_quota: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="service_start_date">วันที่เริ่มให้บริการ</Label>
            <Input
              id="service_start_date"
              type="date"
              value={form.service_start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, service_start_date: e.target.value }))}
            />
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
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">สถานะ</Label>
            <Select
              value={form.status}
              onValueChange={(value: Breeder['status']) =>
                setForm((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ให้บริการอยู่ (ACTIVE)</SelectItem>
                <SelectItem value="INACTIVE">ปิดรับชั่วคราว (INACTIVE)</SelectItem>
                <SelectItem value="RETIRED">ปลดระวาง (RETIRED)</SelectItem>
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
