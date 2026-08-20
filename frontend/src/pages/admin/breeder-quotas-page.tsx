import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { BreederQuotaFormDialog } from '@/components/breeders/breeder-quota-form-dialog'
import { useBreederQuery } from '@/hooks/use-breeders'
import { useBreederQuotasQuery, useDeleteBreederQuota } from '@/hooks/use-breeder-quotas'
import { toastApiError } from '@/lib/toast'
import type { BreederMonthlyQuota } from '@/types/breeder-quota'

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export function AdminBreederQuotasPage() {
  const { id } = useParams<{ id: string }>()
  const breederId = Number(id)

  const [formOpen, setFormOpen] = useState(false)
  const [editingQuota, setEditingQuota] = useState<BreederMonthlyQuota | undefined>(undefined)
  const [deletingQuota, setDeletingQuota] = useState<BreederMonthlyQuota | null>(null)

  const { data: breeder } = useBreederQuery(breederId)

  const { data, isLoading, isError, refetch } = useBreederQuotasQuery({ breeder: breederId })
  const deleteQuota = useDeleteBreederQuota()

  function openCreate() {
    setEditingQuota(undefined)
    setFormOpen(true)
  }

  function openEdit(quota: BreederMonthlyQuota) {
    setEditingQuota(quota)
    setFormOpen(true)
  }

  function confirmDelete() {
    if (!deletingQuota) return
    deleteQuota.mutate(deletingQuota.id, {
      onSuccess: () => {
        toast.success('ลบโควตาแล้ว')
        setDeletingQuota(null)
      },
      onError: (error) => {
        toastApiError(error)
        setDeletingQuota(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/breeders"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายการพ่อพันธุ์
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          จัดการโควตารายเดือน{breeder ? ` — ${breeder.name}` : ''}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          เพิ่มโควตาเดือนใหม่
        </Button>
      </div>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีการตั้งค่าโควตารายเดือน</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เดือน/ปี</TableHead>
                <TableHead>คิวสูงสุด</TableHead>
                <TableHead>คิวคงเหลือ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((quota) => (
                <TableRow key={quota.id}>
                  <TableCell className="font-medium">
                    {THAI_MONTHS[quota.month - 1]} {quota.year}
                  </TableCell>
                  <TableCell>{quota.max_slots}</TableCell>
                  <TableCell>{quota.remaining_slots}</TableCell>
                  <TableCell>
                    <Badge variant={quota.is_open ? 'default' : 'secondary'}>
                      {quota.is_open ? 'เปิดรับจอง' : 'ปิดรับจอง'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(quota)}
                      aria-label="แก้ไข"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingQuota(quota)}
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
      )}

      {formOpen && (
        <BreederQuotaFormDialog
          key={editingQuota?.id ?? 'create'}
          open={formOpen}
          onOpenChange={setFormOpen}
          breederId={breederId}
          quota={editingQuota}
        />
      )}

      <AlertDialog
        open={Boolean(deletingQuota)}
        onOpenChange={(open) => !open && setDeletingQuota(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบโควตานี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingQuota &&
                `โควตาเดือน ${THAI_MONTHS[deletingQuota.month - 1]} ${deletingQuota.year}`}{' '}
              จะถูกลบ การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteQuota.isPending}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
