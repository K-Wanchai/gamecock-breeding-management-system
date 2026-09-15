import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { useFarmSettingQuery, useUpdateFarmSetting } from '@/hooks/use-settings'
import {
  useVaccinePresetsQuery,
  useCreateVaccinePreset,
  useDeleteVaccinePreset,
} from '@/hooks/use-vaccinations'
import { toastApiError } from '@/lib/toast'
import type { FarmSetting } from '@/lib/api/settings'

/* ─── Farm Info Section ───────────────────────────────────────────────── */

function FarmInfoForm({ initial }: { initial: FarmSetting }) {
  const [farmName, setFarmName] = useState(initial.farm_name)
  const [farmAddress, setFarmAddress] = useState(initial.farm_address)
  const update = useUpdateFarmSetting()

  useEffect(() => {
    setFarmName(initial.farm_name)
    setFarmAddress(initial.farm_address)
  }, [initial.farm_name, initial.farm_address])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate(
      { farm_name: farmName, farm_address: farmAddress },
      {
        onSuccess: () => toast.success('บันทึกข้อมูลฟาร์มแล้ว'),
        onError: toastApiError,
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลฟาร์ม</CardTitle>
        <CardDescription>ชื่อและที่อยู่ที่แสดงในอีเมลแจ้งลูกค้า</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="farm_name">ชื่อฟาร์ม</Label>
            <Input
              id="farm_name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="เช่น ฟาร์มไก่ชนสมชาย"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="farm_address">ที่อยู่ฟาร์ม</Label>
            <Textarea
              id="farm_address"
              rows={3}
              value={farmAddress}
              onChange={(e) => setFarmAddress(e.target.value)}
              placeholder="เลขที่ XX หมู่ X ต.XXX อ.XXX จ.XXX XXXXX"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลฟาร์ม'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* ─── Payment Info Section ────────────────────────────────────────────── */

function PaymentInfoForm({ initial }: { initial: FarmSetting }) {
  const [bankName, setBankName] = useState(initial.bank_name)
  const [accountNumber, setAccountNumber] = useState(initial.account_number)
  const [accountHolder, setAccountHolder] = useState(initial.account_holder)
  const [promptpay, setPromptpay] = useState(initial.promptpay)
  const update = useUpdateFarmSetting()

  useEffect(() => {
    setBankName(initial.bank_name)
    setAccountNumber(initial.account_number)
    setAccountHolder(initial.account_holder)
    setPromptpay(initial.promptpay)
  }, [initial.bank_name, initial.account_number, initial.account_holder, initial.promptpay])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate(
      {
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        promptpay: promptpay,
      },
      {
        onSuccess: () => toast.success('บันทึกข้อมูลบัญชีแล้ว'),
        onError: toastApiError,
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>บัญชีธนาคาร / PromptPay</CardTitle>
        <CardDescription>แสดงในหน้าชำระเงินของลูกค้าพร้อม QR Code</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bank_name">ธนาคาร</Label>
              <Input
                id="bank_name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="เช่น ธนาคารกสิกรไทย"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account_number">เลขบัญชี</Label>
              <Input
                id="account_number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="เช่น 123-4-56789-0"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="account_holder">ชื่อบัญชี</Label>
              <Input
                id="account_holder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="เช่น นาย สมชาย ใจดี"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="promptpay">เบอร์ PromptPay</Label>
              <Input
                id="promptpay"
                value={promptpay}
                onChange={(e) => setPromptpay(e.target.value)}
                placeholder="เช่น 0812345678"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                ใส่เบอร์โทรศัพท์ที่ผูก PromptPay ไว้ (ไม่ต้องใส่รหัสประเทศ)
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบัญชี'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* ─── Vaccine Presets Section ─────────────────────────────────────────── */

function VaccinePresetsSection() {
  const [newName, setNewName] = useState('')
  const { data: presets, isLoading } = useVaccinePresetsQuery()
  const createPreset = useCreateVaccinePreset()
  const deletePreset = useDeleteVaccinePreset()

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    createPreset.mutate(name, {
      onSuccess: () => {
        toast.success(`เพิ่มวัคซีน "${name}" แล้ว`)
        setNewName('')
      },
      onError: toastApiError,
    })
  }

  function handleDelete(id: number, name: string) {
    deletePreset.mutate(id, {
      onSuccess: () => toast.success(`ลบวัคซีน "${name}" แล้ว`),
      onError: toastApiError,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>วัคซีนพื้นฐาน</CardTitle>
        <CardDescription>รายชื่อวัคซีนที่แสดงเป็นตัวเลือกในแบบฟอร์มบันทึกการฉีดวัคซีน</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : presets && presets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Badge key={p.id} variant="secondary" className="gap-1 pr-1 text-sm">
                {p.name}
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={deletePreset.isPending}
                  className="ml-1 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  aria-label={`ลบ ${p.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีวัคซีนพื้นฐาน</p>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="ชื่อวัคซีน เช่น นิวคาสเซิล"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" disabled={createPreset.isPending || !newName.trim()}>
            <Plus className="mr-1 size-4" />
            เพิ่ม
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export function AdminSettingsPage() {
  const { data, isLoading, isError, refetch } = useFarmSettingQuery()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">ตั้งค่าระบบ</h1>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : data ? (
        <>
          <FarmInfoForm initial={data} />
          <PaymentInfoForm initial={data} />
        </>
      ) : null}

      <VaccinePresetsSection />
    </div>
  )
}
