import { Input } from '@/components/ui/input'

interface CustomerIdFilterProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

/** No admin "list customers" endpoint exists yet, so this filters by raw numeric customer id rather than a name picker. */
export function CustomerIdFilter({ value, onChange }: CustomerIdFilterProps) {
  return (
    <Input
      type="number"
      min="1"
      placeholder="รหัสลูกค้า (Customer ID)"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="w-44"
    />
  )
}
