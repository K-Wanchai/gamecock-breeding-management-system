import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { VaccinationFormDialog } from '@/components/vaccinations/vaccination-form-dialog'
import { useVaccinationsQuery } from '@/hooks/use-vaccinations'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const PAGE_SIZE = 20

export function AdminVaccinationsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useVaccinationsQuery({
    page,
    search: debouncedSearch || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ประวัติการฉีดวัคซีน</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          บันทึกวัคซีน
        </Button>
      </div>

        <Input
          placeholder="ค้นหาเลขปีกกิ๊ป, ชื่อวัคซีน..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        {isLoading ? (
          <SectionLoading />
        ) : isError ? (
          <QueryError onRetry={refetch} />
        ) : !data || data.results.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">ยังไม่มีบันทึกการฉีดวัคซีน</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่ฉีด</TableHead>
                    <TableHead>ลูกไก่</TableHead>
                    <TableHead>ชื่อวัคซีน</TableHead>
                    <TableHead>เข็มที่</TableHead>
                    <TableHead>อายุตอนฉีด</TableHead>
                    <TableHead>ผู้บันทึก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((vaccination) => (
                    <TableRow key={vaccination.id}>
                      <TableCell className="font-medium">{vaccination.vaccination_date}</TableCell>
                      <TableCell>
                        <Link
                          to={`/admin/chicks/${vaccination.chick.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {vaccination.chick.wing_clip_number}
                        </Link>
                      </TableCell>
                      <TableCell>{vaccination.vaccine_name}</TableCell>
                      <TableCell>{vaccination.dose_number}</TableCell>
                      <TableCell>
                        {vaccination.age_days !== null ? `${vaccination.age_days} วัน` : '-'}
                      </TableCell>
                      <TableCell>{vaccination.recorded_by.username}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
          </>
        )}

      {formOpen && <VaccinationFormDialog open={formOpen} onOpenChange={setFormOpen} />}
    </div>
  )
}
