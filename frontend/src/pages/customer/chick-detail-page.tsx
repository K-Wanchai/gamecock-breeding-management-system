import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { formatThaiDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { DocumentList } from '@/components/documents/document-list'
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

export function ChickDetailPage() {
  const { id } = useParams<{ id: string }>()
  const chickId = Number(id)

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
        to="/app/chicks"
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
          <InfoRow label="วันเกิด" value={formatThaiDate(chick.birth_date)} />
          {chick.color_note && <InfoRow label="ลักษณะสี" value={chick.color_note} />}
          <InfoRow
            label="การจอง"
            value={
              <Link
                to={`/app/bookings/${chick.booking.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {chick.booking.booking_number}
              </Link>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติสุขภาพ</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {!healthRecords || healthRecords.results.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
          ) : (
            healthRecords.results.map((record) => (
              <div key={record.id} className="flex justify-between py-2 text-sm font-medium">
                <span>{formatThaiDate(record.record_date)}</span>
                <span className="text-right">{record.observation || '-'}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติวัคซีน</CardTitle>
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
                  <span>{formatThaiDate(vaccination.vaccination_date)}</span>
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
        <CardHeader>
          <CardTitle className="text-base">เอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList params={{ chick: chickId }} />
        </CardContent>
      </Card>
    </div>
  )
}
