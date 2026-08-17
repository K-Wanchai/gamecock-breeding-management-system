import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ImageOff, CalendarRange } from 'lucide-react'
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
import { Pagination } from '@/components/shared/pagination'
import { BreederFormDialog } from '@/components/breeders/breeder-form-dialog'
import { useBreedersQuery, useDeleteBreeder } from '@/hooks/use-breeders'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { toastApiError } from '@/lib/toast'
import { toast } from 'sonner'
import type { Breeder, BreederStatus } from '@/types/breeder'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<BreederStatus, string> = {
  ACTIVE: 'ให้บริการอยู่',
  INACTIVE: 'ปิดรับชั่วคราว',
  RETIRED: 'ปลดระวาง',
}

const STATUS_VARIANT: Record<BreederStatus, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  RETIRED: 'outline',
}

export function AdminBreedersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BreederStatus | 'ALL'>('ALL')
  const debouncedSearch = useDebouncedValue(search)

  const [formOpen, setFormOpen] = useState(false)
  const [editingBreeder, setEditingBreeder] = useState<Breeder | undefined>(undefined)
  const [deletingBreeder, setDeletingBreeder] = useState<Breeder | null>(null)

  const { data, isLoading } = useBreedersQuery({
    page,
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const deleteBreeder = useDeleteBreeder()

  function openCreate() {
    setEditingBreeder(undefined)
    setFormOpen(true)
  }

  function openEdit(breeder: Breeder) {
    setEditingBreeder(breeder)
    setFormOpen(true)
  }

  function confirmDelete() {
    if (!deletingBreeder) return
    deleteBreeder.mutate(deletingBreeder.id, {
      onSuccess: () => {
        toast.success('ลบข้อมูลพ่อพันธุ์แล้ว')
        setDeletingBreeder(null)
      },
      onError: (error) => {
        toastApiError(error)
        setDeletingBreeder(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ข้อมูลพ่อพันธุ์</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          เพิ่มพ่อพันธุ์ใหม่
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
          onValueChange={(value: BreederStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกสถานะ</SelectItem>
            <SelectItem value="ACTIVE">ให้บริการอยู่</SelectItem>
            <SelectItem value="INACTIVE">ปิดรับชั่วคราว</SelectItem>
            <SelectItem value="RETIRED">ปลดระวาง</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีข้อมูลพ่อพันธุ์</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">รูป</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>สายพันธุ์</TableHead>
                  <TableHead>ราคา</TableHead>
                  <TableHead>โควตา/เดือน</TableHead>
                  <TableHead>เหลือเดือนนี้</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((breeder) => (
                  <TableRow key={breeder.id}>
                    <TableCell>
                      {breeder.image ? (
                        <img
                          src={breeder.image}
                          alt={breeder.name}
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                          <ImageOff className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{breeder.name}</TableCell>
                    <TableCell>{breeder.breed || '-'}</TableCell>
                    <TableCell>{breeder.service_rate} บาท</TableCell>
                    <TableCell>{breeder.default_monthly_quota}</TableCell>
                    <TableCell>{breeder.remaining_quota_this_month}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[breeder.status]}>
                        {STATUS_LABEL[breeder.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild aria-label="จัดการโควตา">
                        <Link to={`/admin/breeders/${breeder.id}/quotas`}>
                          <CalendarRange className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(breeder)}
                        aria-label="แก้ไข"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingBreeder(breeder)}
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
        <BreederFormDialog
          key={editingBreeder?.id ?? 'create'}
          open={formOpen}
          onOpenChange={setFormOpen}
          breeder={editingBreeder}
        />
      )}

      <AlertDialog
        open={Boolean(deletingBreeder)}
        onOpenChange={(open) => !open && setDeletingBreeder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบข้อมูลพ่อพันธุ์?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ &quot;{deletingBreeder?.name}&quot; ใช่หรือไม่
              การลบนี้ไม่สามารถย้อนกลับได้ (หากมีการจองผูกอยู่แล้วจะไม่สามารถลบได้)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteBreeder.isPending}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
