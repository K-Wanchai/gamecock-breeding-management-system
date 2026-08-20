import { useState } from 'react'
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { HenFormDialog } from '@/components/hens/hen-form-dialog'
import { useDeleteHen, useHensQuery, useUpdateHenStatus } from '@/hooks/use-hens'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toastApiError } from '@/lib/toast'
import { toast } from 'sonner'
import type { Hen, HenStatus } from '@/types/hen'

const PAGE_SIZE = 20

export function HensPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<HenStatus | 'ALL'>('ALL')
  const debouncedSearch = useDebouncedValue(search)

  const [formOpen, setFormOpen] = useState(false)
  const [editingHen, setEditingHen] = useState<Hen | undefined>(undefined)
  const [deletingHen, setDeletingHen] = useState<Hen | null>(null)

  const { data, isLoading, isError, refetch } = useHensQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const updateStatus = useUpdateHenStatus()
  const deleteHen = useDeleteHen()

  function openCreate() {
    setEditingHen(undefined)
    setFormOpen(true)
  }

  function openEdit(hen: Hen) {
    setEditingHen(hen)
    setFormOpen(true)
  }

  function toggleStatus(hen: Hen) {
    const next: HenStatus = hen.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    updateStatus.mutate({ id: hen.id, status: next }, { onError: toastApiError })
  }

  function confirmDelete() {
    if (!deletingHen) return
    deleteHen.mutate(deletingHen.id, {
      onSuccess: () => {
        toast.success('ลบข้อมูลแม่ไก่แล้ว')
        setDeletingHen(null)
      },
      onError: (error) => {
        toastApiError(error)
        setDeletingHen(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">แม่ไก่ของฉัน</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          เพิ่มแม่ไก่ใหม่
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="ค้นหาชื่อ, สายพันธุ์, สายเลือด..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value: HenStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกสถานะ</SelectItem>
            <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
            <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีข้อมูลแม่ไก่</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">รูป</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>สายพันธุ์</TableHead>
                  <TableHead>อายุ (เดือน)</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((hen) => (
                  <TableRow key={hen.id}>
                    <TableCell>
                      {hen.image ? (
                        <img
                          src={hen.image}
                          alt={hen.name}
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                          <ImageOff className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{hen.name}</TableCell>
                    <TableCell>{hen.breed || '-'}</TableCell>
                    <TableCell>{hen.age_months ?? '-'}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleStatus(hen)}>
                        <Badge variant={hen.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {hen.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(hen)}
                        aria-label="แก้ไข"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingHen(hen)}
                        aria-label="ลบ"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      {formOpen && (
        <HenFormDialog
          key={editingHen?.id ?? 'create'}
          open={formOpen}
          onOpenChange={setFormOpen}
          hen={editingHen}
        />
      )}

      <AlertDialog
        open={Boolean(deletingHen)}
        onOpenChange={(open) => !open && setDeletingHen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบข้อมูลแม่ไก่?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ &quot;{deletingHen?.name}&quot; ใช่หรือไม่ การลบนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteHen.isPending}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
