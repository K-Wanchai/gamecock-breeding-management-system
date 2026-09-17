import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { formatThaiDate } from '@/lib/utils'
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
import { HealthRecordFormDialog } from '@/components/health/health-record-form-dialog'
import { useHealthRecordsQuery } from '@/hooks/use-health-records'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const PAGE_SIZE = 20

export function AdminHealthPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useHealthRecordsQuery({
    page,
    search: debouncedSearch || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">สุขภาพ</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          บันทึกสุขภาพ
        </Button>
      </div>

      <Input
        placeholder="ค้นหาเลขปีกกิ๊ป..."
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
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีบันทึกสุขภาพ</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่บันทึก</TableHead>
                  <TableHead>ลูกไก่</TableHead>
                  <TableHead>น้ำหนัก</TableHead>
                  <TableHead>อาการที่พบ</TableHead>
                  <TableHead>ยาที่ใช้</TableHead>
                  <TableHead>ผู้บันทึก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{formatThaiDate(record.record_date)}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/chicks/${record.chick.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {record.chick.wing_clip_number}
                      </Link>
                    </TableCell>
                    <TableCell>{record.weight ? `${record.weight} กรัม` : '-'}</TableCell>
                    <TableCell>{record.symptom || '-'}</TableCell>
                    <TableCell>{record.medicine || '-'}</TableCell>
                    <TableCell>{record.recorded_by.username}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      {formOpen && <HealthRecordFormDialog open={formOpen} onOpenChange={setFormOpen} />}
    </div>
  )
}
