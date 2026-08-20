import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBreedersQuery } from '@/hooks/use-breeders'

interface BreederFilterSelectProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

export function BreederFilterSelect({ value, onChange }: BreederFilterSelectProps) {
  const { data } = useBreedersQuery({ page: 1 })

  return (
    <Select
      value={value ? String(value) : 'ALL'}
      onValueChange={(next) => onChange(next === 'ALL' ? undefined : Number(next))}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="ทุกพ่อพันธุ์" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">ทุกพ่อพันธุ์</SelectItem>
        {data?.results.map((breeder) => (
          <SelectItem key={breeder.id} value={String(breeder.id)}>
            {breeder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
