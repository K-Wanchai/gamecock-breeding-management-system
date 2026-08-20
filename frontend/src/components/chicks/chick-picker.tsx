import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChicksQuery } from '@/hooks/use-chicks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { Chick } from '@/types/chick'

interface ChickPickerProps {
  value: Chick | null
  onChange: (chick: Chick | null) => void
}

/** Search-then-pick a chick — used wherever a form needs a chick that isn't already fixed by page context (e.g. the farm-wide /admin/health, /admin/vaccinations, /admin/documents pages). */
export function ChickPicker({ value, onChange }: ChickPickerProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const { data } = useChicksQuery({ search: debouncedSearch || undefined })

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <Label>ลูกไก่</Label>
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>
            {value.wing_clip_number}
            {value.name && ` — ${value.name}`}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            เปลี่ยน
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="chick_search">ลูกไก่</Label>
      <Input
        id="chick_search"
        placeholder="ค้นหาเลขปีกกิ๊ป, ชื่อ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {data && data.results.length > 0 && (
        <ul className="flex max-h-40 flex-col divide-y overflow-y-auto rounded-md border">
          {data.results.map((chick) => (
            <li key={chick.id}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => onChange(chick)}
              >
                {chick.wing_clip_number}
                {chick.name && ` — ${chick.name}`}
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.results.length === 0 && search && (
        <p className="text-sm text-muted-foreground">ไม่พบลูกไก่</p>
      )}
    </div>
  )
}
