import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { useNotificationsQuery, useRetryNotification } from '@/hooks/use-notifications'
import { toastApiError } from '@/lib/toast'
import { NOTIFICATION_STATUS_LABEL } from '@/types/notification'
import type { NotificationStatus } from '@/types/notification'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: NotificationStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'PENDING', label: 'รอส่ง' },
  { value: 'SENT', label: 'ส่งแล้ว' },
  { value: 'FAILED', label: 'ส่งไม่สำเร็จ' },
]

const STATUS_VARIANT: Record<NotificationStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SENT: 'default',
  FAILED: 'destructive',
}

export function AdminNotificationsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<NotificationStatus | 'ALL'>('FAILED')

  const { data, isLoading, isError, refetch } = useNotificationsQuery({
    page,
    status: status === 'ALL' ? undefined : status,
  })

  const retryNotification = useRetryNotification()

  function handleRetry(id: number) {
    retryNotification.mutate(id, {
      onSuccess: (notification) => {
        toast.success(
          notification.status === 'SENT'
            ? 'ส่งแจ้งเตือนสำเร็จแล้ว'
            : `ลองส่งใหม่แล้ว แต่ยังไม่สำเร็จ (${notification.error_note ?? 'ไม่ทราบสาเหตุ'})`,
        )
      },
      onError: toastApiError,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">การแจ้งเตือน</h1>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value: NotificationStatus | 'ALL') => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
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
        <p className="py-16 text-center text-muted-foreground">ไม่พบการแจ้งเตือน</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่สร้าง</TableHead>
                  <TableHead>ผู้รับ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ข้อความ</TableHead>
                  <TableHead>เกี่ยวข้องกับ</TableHead>
                  <TableHead>ลองส่งแล้ว</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleString('th-TH')}
                    </TableCell>
                    <TableCell>{notification.user.username}</TableCell>
                    <TableCell>{notification.notif_type}</TableCell>
                    <TableCell className="max-w-xs truncate" title={notification.message}>
                      {notification.message}
                    </TableCell>
                    <TableCell>
                      {notification.booking?.booking_number || notification.chick?.wing_clip_number || '-'}
                    </TableCell>
                    <TableCell>{notification.retry_count} ครั้ง</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[notification.status]}>
                        {NOTIFICATION_STATUS_LABEL[notification.status]}
                      </Badge>
                      {notification.status === 'FAILED' && notification.error_note && (
                        <p className="mt-1 max-w-40 text-xs text-muted-foreground">
                          {notification.error_note}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {notification.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(notification.id)}
                          disabled={retryNotification.isPending}
                        >
                          ลองส่งใหม่
                        </Button>
                      )}
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
