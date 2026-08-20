import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { DocumentList } from '@/components/documents/document-list'
import { DocumentGenerateDialog } from '@/components/documents/document-generate-dialog'
import { HealthRecordFormDialog } from '@/components/health/health-record-form-dialog'
import { VaccinationFormDialog } from '@/components/vaccinations/vaccination-form-dialog'
import { useChickQuery } from '@/hooks/use-chicks'
import { useHealthRecordsQuery } from '@/hooks/use-health-records'
import { useVaccinationsQuery } from '@/hooks/use-vaccinations'
import { CHICK_GENDER_LABEL, CHICK_STATUS_LABEL } from '@/types/chick'
import type { ChickStatus } from '@/types/chick'

const STATUS_VARIANT: Record<ChickStatus, 'default' | 'secondary' | 'destructive'> = {
  ALIVE: 'default',
  DECEASED: 'destructive',
  DELIVERED: 'secondary',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function AdminChickDetailPage() {
  const { id } = useParams<{ id: string }>()
  const chickId = Number(id)

  const [healthFormOpen, setHealthFormOpen] = useState(false)
  const [vaccinationFormOpen, setVaccinationFormOpen] = useState(false)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)

  const { data: chick, isLoading, isError, refetch } = useChickQuery(chickId)
  const { data: healthRecords } = useHealthRecordsQuery({ chick: chickId })
  const { data: vaccinations } = useVaccinationsQuery({ chick: chickId })

  if (isLoading) {
    return <SectionLoading />
  }
  if (isError || !chick) {
    return <QueryError onRetry={refetch} />
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/admin/chicks"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการลูกไก่
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{chick.wing_clip_number}</h1>
        <Badge variant={STATUS_VARIANT[chick.status]}>{CHICK_STATUS_LABEL[chick.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลลูกไก่</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="ชื่อ" value={chick.name || '-'} />
          <InfoRow label="เพศ" value={CHICK_GENDER_LABEL[chick.gender]} />
          <InfoRow label="วันเกิด" value={chick.birth_date} />
          {chick.color_note && <InfoRow label="ลักษณะสี" value={chick.color_note} />}
          <InfoRow
            label="การจอง"
            value={
              <Link
                to={`/admin/bookings/${chick.booking.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {chick.booking.booking_number}
              </Link>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ประวัติสุขภาพ</CardTitle>
          <Button size="sm" onClick={() => setHealthFormOpen(true)}>
            <Plus className="size-3.5" />
            บันทึกสุขภาพ
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {!healthRecords || healthRecords.results.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
          ) : (
            healthRecords.results.map((record) => (
              <div key={record.id} className="flex flex-col gap-1 py-2 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{record.record_date}</span>
                  {record.weight && <span>{record.weight} กรัม</span>}
                </div>
                {record.symptom && (
                  <p className="text-muted-foreground">อาการที่พบ: {record.symptom}</p>
                )}
                {record.observation && (
                  <p className="text-muted-foreground">อาการ: {record.observation}</p>
                )}
                {record.medicine && (
                  <p className="text-muted-foreground">ยาที่ใช้: {record.medicine}</p>
                )}
                {record.remark && (
                  <p className="text-muted-foreground">หมายเหตุ: {record.remark}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ประวัติวัคซีน</CardTitle>
          <Button size="sm" onClick={() => setVaccinationFormOpen(true)}>
            <Plus className="size-3.5" />
            บันทึกวัคซีน
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {!vaccinations || vaccinations.results.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">ยังไม่มีบันทึกการฉีดวัคซีน</p>
          ) : (
            vaccinations.results.map((vaccination) => (
              <div key={vaccination.id} className="flex flex-col gap-1 py-2 text-sm">
                <div className="flex justify-between font-medium">
                  <span>
                    {vaccination.vaccine_name} (เข็มที่ {vaccination.dose_number})
                  </span>
                  <span>{vaccination.vaccination_date}</span>
                </div>
                {vaccination.age_days !== null && (
                  <p className="text-muted-foreground">อายุตอนฉีด: {vaccination.age_days} วัน</p>
                )}
                {vaccination.remark && (
                  <p className="text-muted-foreground">หมายเหตุ: {vaccination.remark}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">เอกสาร</CardTitle>
          <Button size="sm" onClick={() => setDocumentFormOpen(true)}>
            <Plus className="size-3.5" />
            สร้างเอกสาร
          </Button>
        </CardHeader>
        <CardContent>
          <DocumentList params={{ chick: chickId }} />
        </CardContent>
      </Card>

      {healthFormOpen && (
        <HealthRecordFormDialog open={healthFormOpen} onOpenChange={setHealthFormOpen} chick={chick} />
      )}
      {vaccinationFormOpen && (
        <VaccinationFormDialog
          open={vaccinationFormOpen}
          onOpenChange={setVaccinationFormOpen}
          chick={chick}
        />
      )}
      {documentFormOpen && (
        <DocumentGenerateDialog open={documentFormOpen} onOpenChange={setDocumentFormOpen} chick={chick} />
      )}
    </div>
  )
}
