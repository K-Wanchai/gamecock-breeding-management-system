import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** "2026-09-16" → "16 กันยายน 2569" */
function toThaiLabel(value: string): string {
  if (!value) return ''
  const d = new Date(`${value}T00:00:00`)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** "2026-09-16" → Date object (local midnight) */
function parseIso(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  return isNaN(d.getTime()) ? undefined : d
}

/** Date → "YYYY-MM-DD" */
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface ThaiDateInputProps {
  id?: string
  value: string
  onValueChange: (isoDate: string) => void
  min?: string
  max?: string
  required?: boolean
  className?: string
  placeholder?: string
}

/**
 * Date picker with Thai Buddhist Era calendar and Thai-format display.
 * Replaces all <Input type="date"> in forms.
 * value / onValueChange work with ISO YYYY-MM-DD strings.
 */
export function ThaiDateInput({
  id,
  value,
  onValueChange,
  min,
  max,
  className,
  placeholder = 'เลือกวันที่',
}: ThaiDateInputProps) {
  const [open, setOpen] = React.useState(false)

  const selected = parseIso(value)
  const minDate = min ? parseIso(min) : undefined
  const maxDate = max ? parseIso(max) : undefined

  function handleSelect(date: Date | undefined) {
    if (!date) return
    onValueChange(toIso(date))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? toThaiLabel(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
