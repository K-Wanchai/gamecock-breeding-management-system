import { CheckCircle2 } from 'lucide-react'
import { BREEDING_EVENT_LABEL } from '@/types/breeding'
import type { BreedingEvent } from '@/types/breeding'

/** Backend returns events ordered by event_date, id — already the stage order since transitions only ever move forward. */
export function BreedingTimeline({ events }: { events: BreedingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลความคืบหน้าการผสมพันธุ์</p>
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">{BREEDING_EVENT_LABEL[event.status]}</span>
            <span className="text-xs text-muted-foreground">{event.event_date}</span>
            {event.description && (
              <span className="text-sm text-muted-foreground">{event.description}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
