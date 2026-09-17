import { useEggsQuery } from '@/hooks/use-breeding'
import { useHatchingsQuery } from '@/hooks/use-hatchings'
import { formatThaiDate } from '@/lib/utils'
import { HATCHING_STATUS_LABEL } from '@/types/hatching'
import type { Egg } from '@/types/breeding'

function HatchingCard({ eggId }: { eggId: number }) {
  const { data } = useHatchingsQuery({ egg: eggId })

  if (!data || data.results.length === 0) return null

  return (
    <>
      {data.results.map((hatching) => (
        <div key={hatching.id} className="rounded bg-muted p-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">{HATCHING_STATUS_LABEL[hatching.status]}</span>
            <span>อัตราการฟัก {hatching.hatching_rate}%</span>
          </div>
          <p className="text-muted-foreground">
            เริ่มฟัก {formatThaiDate(hatching.started_at)}
            {hatching.completed_at && ` — เสร็จสิ้น ${formatThaiDate(hatching.completed_at)}`}
          </p>
          <p>
            ฟักออก {hatching.hatched_count} / ไม่สำเร็จ {hatching.failed_count} / รอดชีวิต{' '}
            {hatching.survival_count}
          </p>
        </div>
      ))}
    </>
  )
}

function EggCard({ egg }: { egg: Egg }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>วันที่ออกไข่: {formatThaiDate(egg.egg_date)}</span>
        <span>
          ไข่ทั้งหมด {egg.total_eggs} ฟอง (ดี {egg.good_eggs} / เสีย {egg.bad_eggs}, อัตรา{' '}
          {egg.good_egg_rate}
          %)
        </span>
      </div>
      {egg.incubation_date && (
        <p className="text-sm text-muted-foreground">วันที่เข้าตู้ฟัก: {formatThaiDate(egg.incubation_date)}</p>
      )}
      <HatchingCard eggId={egg.id} />
    </div>
  )
}

export function EggHatchingSection({ bookingId }: { bookingId: number }) {
  const { data } = useEggsQuery({ booking: bookingId })

  if (!data || data.results.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลไข่</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {data.results.map((egg) => (
        <EggCard key={egg.id} egg={egg} />
      ))}
    </div>
  )
}
