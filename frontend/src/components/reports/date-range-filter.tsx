import { Button } from '@/components/ui/button'
import { ThaiDateInput } from '@/components/ui/thai-date-input'

interface DateRangeFilterProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) {
  return (
    <>
      <ThaiDateInput
        value={dateFrom}
        onValueChange={onDateFromChange}
        placeholder="วันที่เริ่มต้น"
        max={dateTo || undefined}
        className="w-44"
      />
      <ThaiDateInput
        value={dateTo}
        onValueChange={onDateToChange}
        placeholder="วันที่สิ้นสุด"
        min={dateFrom || undefined}
        className="w-44"
      />
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onDateFromChange('')
            onDateToChange('')
          }}
        >
          ล้างวันที่
        </Button>
      )}
    </>
  )
}
