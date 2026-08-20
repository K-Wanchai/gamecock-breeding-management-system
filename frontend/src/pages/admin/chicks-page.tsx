import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { useChicksQuery } from '@/hooks/use-chicks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { CHICK_GENDER_LABEL, CHICK_STATUS_LABEL } from '@/types/chick'
import type { ChickStatus } from '@/types/chick'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: ChickStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'ALIVE', label: 'มีชีวิต' },
  { value: 'DECEASED', label: 'ตาย' },
  { value: 'DELIVERED', label: 'ส่งมอบแล้ว' },
]

const STATUS_VARIANT: Record<ChickStatus, 'default' | 'secondary' | 'destructive'> = {
  ALIVE: 'default',
  DECEASED: 'destructive',
  DELIVERED: 'secondary',
}

/** Read-only browse of every chick farm-wide — recording new chicks happens from the owning booking's management page (/admin/bookings/:id) since a chick is always scoped to one HATCHED hatching batch. */
export function AdminChicksPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ChickStatus | 'ALL'>('ALL')
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useChicksQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ลูกไก่</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหาเลขปีกกิ๊ป, ชื่อ..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value: ChickStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีข้อมูลลูกไก่</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขปีกกิ๊ป</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>เพศ</TableHead>
                  <TableHead>วันเกิด</TableHead>
                  <TableHead>การจอง</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((chick) => (
                  <TableRow key={chick.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/chicks/${chick.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {chick.wing_clip_number}
                      </Link>
                    </TableCell>
                    <TableCell>{chick.name || '-'}</TableCell>
                    <TableCell>{CHICK_GENDER_LABEL[chick.gender]}</TableCell>
                    <TableCell>{chick.birth_date}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/bookings/${chick.booking.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {chick.booking.booking_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[chick.status]}>
                        {CHICK_STATUS_LABEL[chick.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
