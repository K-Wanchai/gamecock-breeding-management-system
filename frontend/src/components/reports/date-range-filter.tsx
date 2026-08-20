import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-40"
        aria-label="วันที่เริ่มต้น"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-40"
        aria-label="วันที่สิ้นสุด"
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
