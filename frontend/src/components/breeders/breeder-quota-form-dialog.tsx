import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { useCreateBreederQuota, useUpdateBreederQuota } from '@/hooks/use-breeder-quotas'
import { toastApiError } from '@/lib/toast'
import type { BreederMonthlyQuota, BreederMonthlyQuotaFormValues } from '@/types/breeder-quota'

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

function emptyForm(): BreederMonthlyQuotaFormValues {
  const now = new Date()
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    max_slots: '0',
    is_open: true,
  }
}

function formValuesFromQuota(quota: BreederMonthlyQuota): BreederMonthlyQuotaFormValues {
  return {
    year: String(quota.year),
    month: String(quota.month),
    max_slots: String(quota.max_slots),
    is_open: quota.is_open,
  }
}

interface BreederQuotaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breederId: number
  quota?: BreederMonthlyQuota
}

/** Rendered only while `open` is true — mounted via `{formOpen && <BreederQuotaFormDialog key=.../>}`. */
export function BreederQuotaFormDialog({
  open,
  onOpenChange,
  breederId,
  quota,
}: BreederQuotaFormDialogProps) {
  const isEdit = Boolean(quota)
  const [form, setForm] = useState<BreederMonthlyQuotaFormValues>(() =>
    quota ? formValuesFromQuota(quota) : emptyForm(),
  )

  const createQuota = useCreateBreederQuota()
  const updateQuota = useUpdateBreederQuota()
  const isPending = createQuota.isPending || updateQuota.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const onSuccess = () => {
      toast.success(isEdit ? 'บันทึกโควตาสำเร็จ' : 'เพิ่มโควตาสำเร็จ')
      onOpenChange(false)
    }
    if (isEdit && quota) {
      updateQuota.mutate({ id: quota.id, values: form }, { onSuccess, onError: toastApiError })
    } else {
      createQuota.mutate({ breederId, values: form }, { onSuccess, onError: toastApiError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขโควตารายเดือน' : 'เพิ่มโควตารายเดือน'}</DialogTitle>
          <DialogDescription>กำหนดจำนวนคิวสูงสุดที่รับได้ในเดือนนั้น</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="year">ปี (ค.ศ.)</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                disabled={isEdit}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="month">เดือน</Label>
              <Select
                value={form.month}
                onValueChange={(value) => setForm((prev) => ({ ...prev, month: value }))}
                disabled={isEdit}
              >
                <SelectTrigger id="month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THAI_MONTHS.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="max_slots">จำนวนคิวสูงสุด</Label>
            <Input
              id="max_slots"
              type="number"
              min="0"
              value={form.max_slots}
              onChange={(e) => setForm((prev) => ({ ...prev, max_slots: e.target.value }))}
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="is_open">เปิดรับจอง</Label>
            <Switch
              id="is_open"
              checked={form.is_open}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_open: checked }))}
            />
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
