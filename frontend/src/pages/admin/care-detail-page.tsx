import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, HeartPulse, Plus, Syringe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { ThaiDateInput } from '@/components/ui/thai-date-input'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { useBookingQuery, useMarkClipReady } from '@/hooks/use-bookings'
import { useVaccinationsQuery, useCreateVaccination, useVaccinePresetsQuery } from '@/hooks/use-vaccinations'
import { useChicksQuery, useCreateChick } from '@/hooks/use-chicks'
import { useHatchingsQuery } from '@/hooks/use-hatchings'
import { useHealthRecordsQuery, useCreateHealthRecord } from '@/hooks/use-health'
import { formatThaiDate } from '@/lib/utils'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/* ─── Dialog บันทึกสุขภาพ ────────────────────────────────────────────────── */

function HealthRecordDialog({
  open,
  onOpenChange,
  bookingId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: number
}) {
  const [recordDate, setRecordDate] = useState(todayStr())
  const [observation, setObservation] = useState('')

  const { data: chicksData, isLoading: chicksLoading } = useChicksQuery({ booking: bookingId })
  const { data: hatchingsData, isLoading: hatchingsLoading } = useHatchingsQuery({ booking: bookingId })
  const createHealthRecord = useCreateHealthRecord()
  const createChick = useCreateChick()

  const chicks = chicksData?.results ?? []
  const hatching = hatchingsData?.results.find((h) => h.status === 'HATCHED')
  const chickCount = chicks.length > 0 ? chicks.length : (hatching?.hatched_count ?? 0)

  const isLoading = chicksLoading || hatchingsLoading
  const canSave = !isLoading && chickCount > 0 && observation.trim().length > 0
  const isSaving = createChick.isPending || createHealthRecord.isPending

  async function handleSave() {
    if (!canSave) return
    try {
      let targetChicks = chicks
      if (targetChicks.length === 0 && hatching) {
        const created = await Promise.all(
          Array.from({ length: hatching.hatched_count }, () =>
            createChick.mutateAsync({ hatching: hatching.id, birth_date: todayStr() }),
          ),
        )
        targetChicks = created
      }
      await Promise.all(
        targetChicks.map((chick) =>
          createHealthRecord.mutateAsync({
            chick: chick.id,
            record_date: recordDate,
            observation: observation.trim(),
          }),
        ),
      )
      onOpenChange(false)
      setObservation('')
      setRecordDate(todayStr())
    } catch {
      // error surfaced by mutation toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกสุขภาพไก่</DialogTitle>
          <DialogDescription>อัพเดตสถานะสุขภาพลูกไก่ทั้งคอก</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : chickCount === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการฟักในระบบสำหรับการจองนี้</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
              <span className="text-sm text-blue-800">
                บันทึกสุขภาพให้ลูกไก่ทั้งหมด <span className="font-semibold">{chickCount} ตัว</span>
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="record_date">วันที่บันทึก</Label>
              <ThaiDateInput
                id="record_date"
                value={recordDate}
                onValueChange={setRecordDate}
                max={todayStr()}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="observation">อัพเดตสุขภาพ</Label>
              <Textarea
                id="observation"
                rows={4}
                placeholder="เช่น ไก่แข็งแรงดี กินอาหารปกติ..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Dialog จัดทำวัคซีน ─────────────────────────────────────────────────── */

function VaccineScheduleDialog({
  open,
  onOpenChange,
  bookingId,
  nextDose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: number
  nextDose: number
}) {
  const [vaccineDate, setVaccineDate] = useState(todayStr())
  const [vaccineName, setVaccineName] = useState('')
  const [remark, setRemark] = useState('')

  const { data: presets, isLoading: presetsLoading } = useVaccinePresetsQuery()
  const { data: chicksData, isLoading: chicksLoading } = useChicksQuery({ booking: bookingId })
  const { data: hatchingsData, isLoading: hatchingsLoading } = useHatchingsQuery({ booking: bookingId })
  const createChick = useCreateChick()
  const createVaccination = useCreateVaccination()

  const chicks = chicksData?.results ?? []
  const hatching = hatchingsData?.results.find((h) => h.status === 'HATCHED')
  const chickCount = chicks.length > 0 ? chicks.length : (hatching?.hatched_count ?? 0)

  const isLoading = chicksLoading || hatchingsLoading
  const canSave = !isLoading && chickCount > 0 && Boolean(vaccineName)
  const isSaving = createChick.isPending || createVaccination.isPending

  async function handleSave() {
    if (!canSave) return
    try {
      let targetChicks = chicks
      if (targetChicks.length === 0 && hatching) {
        const created = await Promise.all(
          Array.from({ length: hatching.hatched_count }, () =>
            createChick.mutateAsync({ hatching: hatching.id, birth_date: todayStr() }),
          ),
        )
        targetChicks = created
      }
      await Promise.all(
        targetChicks.map((chick) =>
          createVaccination.mutateAsync({
            chick: chick.id,
            vaccine_name: vaccineName,
            vaccination_date: vaccineDate,
            dose_number: nextDose,
            remark: remark || undefined,
          }),
        ),
      )
      onOpenChange(false)
      setVaccineName('')
      setRemark('')
      setVaccineDate(todayStr())
    } catch {
      // error surfaced by mutation toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>จัดทำวัคซีน</DialogTitle>
          <DialogDescription>เลือกวันที่และวัคซีนที่ต้องการฉีด</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : chickCount === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการฟักในระบบสำหรับการจองนี้</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-amber-800">
                ลูกไก่ทั้งหมด <span className="font-semibold">{chickCount} ตัว</span> — ฉีดพร้อมกันทั้งคอก
              </span>
              <Badge className="bg-amber-600 text-white text-xs">ครั้งที่ {nextDose}</Badge>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="vaccine_date">วันที่ฉีด</Label>
              <ThaiDateInput
                id="vaccine_date"
                value={vaccineDate}
                onValueChange={setVaccineDate}
                max={todayStr()}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="vaccine_name">วัคซีน</Label>
              {presetsLoading ? (
                <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
              ) : (
                <Select value={vaccineName} onValueChange={setVaccineName}>
                  <SelectTrigger id="vaccine_name" className="w-full">
                    <SelectValue placeholder="เลือกวัคซีน" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets && presets.length > 0 ? (
                      presets.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        ยังไม่มีวัคซีนในระบบ
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="vax_remark">หมายเหตุ</Label>
              <Input
                id="vax_remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="(ไม่บังคับ)"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export function AdminCareDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)
  const navigate = useNavigate()
  const markClipReady = useMarkClipReady()

  const [healthDialogOpen, setHealthDialogOpen] = useState(false)
  const [vaccineDialogOpen, setVaccineDialogOpen] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const { data: vaccinationsData, isLoading: vacLoading } = useVaccinationsQuery({ booking: bookingId, page: 1 })
  const { data: healthData, isLoading: healthLoading } = useHealthRecordsQuery({ booking: bookingId, page: 1 })

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  const vaccinations = vaccinationsData?.results ?? []
  const healthRecords = healthData?.results ?? []
  const uniqueHealthSessions = healthRecords.filter(
    (h, i, arr) => arr.findIndex((x) => x.record_date === h.record_date && x.observation === h.observation) === i,
  )

  // แสดงแค่ 1 แถวต่อครั้ง (group โดย dose_number + vaccine_name)
  const uniqueSessions = vaccinations.filter(
    (v, i, arr) =>
      arr.findIndex((x) => x.dose_number === v.dose_number && x.vaccine_name === v.vaccine_name) === i,
  )

  // คำนวณครั้งถัดไป: max(dose_number) + 1 จาก record ที่มีอยู่
  const nextDose = vaccinations.length > 0
    ? Math.max(...vaccinations.map((v) => v.dose_number)) + 1
    : 1

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/admin/chicks"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการอนุบาลไก่
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <HeartPulse className="size-5" />
          อนุบาลไก่ · {booking.booking_number}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          พ่อพันธุ์: {booking.breeder.name}
          {' · '}ลูกค้า: {booking.customer.username}
        </p>
        {booking.brooding_started_at && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            แม่ไก่เริ่มฟัก {formatThaiDate(booking.brooding_started_at)}
          </p>
        )}
      </div>

      {/* Card 1 — บันทึกสุขภาพไก่ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4" />
            บันทึกสุขภาพไก่
          </CardTitle>
          <Button size="sm" onClick={() => setHealthDialogOpen(true)}>
            <Plus className="size-3.5" />
            บันทึกสุขภาพ
          </Button>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : uniqueHealthSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="flex flex-col divide-y">
              {uniqueHealthSessions.map((h) => (
                <div key={h.id} className="flex items-start justify-between py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm">{h.observation}</p>
                  <Badge variant="outline" className="text-xs shrink-0 ml-3">
                    {formatThaiDate(h.record_date)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — ข้อมูลวัคซีน/การอนุบาล */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="size-4" />
            ข้อมูลวัคซีน/การอนุบาล
          </CardTitle>
          <Button size="sm" onClick={() => setVaccineDialogOpen(true)}>
            <Plus className="size-3.5" />
            จัดทำวัคซีน
          </Button>
        </CardHeader>
        <CardContent>
          {vacLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : uniqueSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลวัคซีน</p>
          ) : (
            <div className="flex flex-col divide-y">
              {uniqueSessions.map((v) => (
                <div key={v.id} className="flex items-start justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{v.vaccine_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ครั้งที่ {v.dose_number}
                      {v.age_days != null ? ` · อายุ ${v.age_days} วัน` : ''}
                    </span>
                    {v.remark && <span className="text-xs text-muted-foreground">{v.remark}</span>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {formatThaiDate(v.vaccination_date)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ปุ่มหยุดการบันทึก */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-800">พร้อมจัดทำเลขกิ๊ปและออกใบประวัติ</p>
          <p className="text-xs text-green-700 mt-0.5">กดเมื่อการอนุบาลเสร็จสิ้นและพร้อมออกเอกสาร</p>
        </div>
        <Button
          className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
          disabled={markClipReady.isPending}
          onClick={() =>
            markClipReady.mutate(bookingId, {
              onSuccess: () => navigate('/admin/wing-clip'),
            })
          }
        >
          <ClipboardList className="size-4" />
          ดำเนินการ
        </Button>
      </div>

      <HealthRecordDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
        bookingId={bookingId}
      />
      <VaccineScheduleDialog
        open={vaccineDialogOpen}
        onOpenChange={setVaccineDialogOpen}
        bookingId={bookingId}
        nextDose={nextDose}
      />
    </div>
  )
}
