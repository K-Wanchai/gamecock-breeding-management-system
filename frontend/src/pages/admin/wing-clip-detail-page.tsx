import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { useBookingQuery, useDownloadBatchCertificate, useDownloadDeliveryLabel } from '@/hooks/use-bookings'
import { useChicksQuery } from '@/hooks/use-chicks'

export function AdminWingClipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bookingId = Number(id)

  const { data: booking, isLoading, isError, refetch } = useBookingQuery(bookingId)
  const { data: chicksData, isLoading: chicksLoading } = useChicksQuery({ booking: bookingId })
  const downloadCert = useDownloadBatchCertificate()
  const downloadLabel = useDownloadDeliveryLabel()

  if (isLoading) return <SectionLoading />
  if (isError || !booking) return <QueryError onRetry={refetch} />

  const chicks = chicksData?.results ?? []

  function handleCert() {
    downloadCert.mutate(
      { id: bookingId, bookingNumber: booking!.booking_number },
      { onError: () => toast.error('ดาวน์โหลดใบรับรองไม่สำเร็จ') },
    )
  }

  function handleLabel() {
    downloadLabel.mutate(
      { id: bookingId, bookingNumber: booking!.booking_number },
      { onError: () => toast.error('ดาวน์โหลดป้ายจัดส่งไม่สำเร็จ') },
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Link
        to="/admin/wing-clip"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการ
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{booking.booking_number}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {booking.breeder.name} × {booking.hen.name}
          {' · '}ลูกค้า: {booking.customer.username}
        </p>
      </div>

      {/* เลขกิ๊ปปีก */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เลขกิ๊ปปีก</CardTitle>
        </CardHeader>
        <CardContent>
          {chicksLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : chicks.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลลูกไก่</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {chicks.map((c) => (
                <Badge key={c.id} variant="outline" className="font-mono text-sm px-3 py-1">
                  {c.wing_clip_number}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ปุ่มดาวน์โหลด */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleCert}
          disabled={downloadCert.isPending || chicks.length === 0}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloadCert.isPending ? (
            <Loader2 className="size-8 animate-spin text-primary" />
          ) : (
            <FileText className="size-8 text-primary" />
          )}
          <div>
            <p className="font-semibold text-primary">ดาวน์โหลดใบรับรองสายพันธุ์</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {chicks.length > 0
                ? `รวม ${chicks.length} ตัว · ${chicks[0].wing_clip_number}${chicks.length > 1 ? ` - ${chicks[chicks.length - 1].wing_clip_number}` : ''}`
                : 'ยังไม่มีข้อมูลลูกไก่'}
            </p>
          </div>
        </button>

        <button
          onClick={handleLabel}
          disabled={downloadLabel.isPending}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-amber-400/40 bg-amber-50 p-6 text-center transition hover:border-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloadLabel.isPending ? (
            <Loader2 className="size-8 animate-spin text-amber-600" />
          ) : (
            <MapPin className="size-8 text-amber-600" />
          )}
          <div>
            <p className="font-semibold text-amber-700">ดาวน์โหลดป้ายจัดส่ง</p>
            <p className="mt-0.5 text-xs text-muted-foreground">ชื่อ · เบอร์โทร · ที่อยู่ลูกค้า</p>
          </div>
        </button>
      </div>

      {/* คำแนะนำ */}
      <p className="text-xs text-muted-foreground">
        ใบรับรองสายพันธุ์: ออก 1 ใบสำหรับไก่ทั้งชุด · ป้ายจัดส่ง: สำหรับปริ้นติดหน้ากล่อง
      </p>
    </div>
  )
}
