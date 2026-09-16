import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, HeartPulse, Syringe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { useBookingQuery } from '@/hooks/use-bookings'
import { useVaccinationsQuery } from '@/hooks/use-vaccinations'
import { useHealthRecordsQuery } from '@/hooks/use-health'
import { formatThaiDate } from '@/lib/utils'

export function CustomerCareDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const { data: vaccinationsData, isLoading: vacLoading } = useVaccinationsQuery({ booking: bookingId, page: 1 })
  const { data: healthData, isLoading: healthLoading } = useHealthRecordsQuery({ booking: bookingId, page: 1 })

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  const vaccinations = vaccinationsData?.results ?? []
  const healthRecords = healthData?.results ?? []

  const uniqueVaccineSessions = vaccinations.filter(
    (v, i, arr) =>
      arr.findIndex((x) => x.dose_number === v.dose_number && x.vaccine_name === v.vaccine_name) === i,
  )

  const uniqueHealthSessions = healthRecords.filter(
    (h, i, arr) =>
      arr.findIndex((x) => x.record_date === h.record_date && x.observation === h.observation) === i,
  )

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        to="/app/care"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการอนุบาลไก่
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <HeartPulse className="size-5" />
          การอนุบาลไก่ · {booking.booking_number}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {booking.hen.name}
          {booking.hen.breed ? ` (${booking.hen.breed})` : ''} × {booking.breeder.name}
        </p>
        {booking.brooding_started_at && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            แม่ไก่เริ่มฟัก {formatThaiDate(booking.brooding_started_at)}
          </p>
        )}
      </div>

      {/* Card สุขภาพ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4" />
            บันทึกสุขภาพไก่
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : uniqueHealthSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
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

      {/* Card วัคซีน */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="size-4" />
            ประวัติการฉีดวัคซีน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vacLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : uniqueVaccineSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการฉีดวัคซีน</p>
          ) : (
            <div className="flex flex-col divide-y">
              {uniqueVaccineSessions.map((v) => (
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
    </div>
  )
}
