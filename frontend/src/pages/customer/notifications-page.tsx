import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { Pagination } from '@/components/shared/pagination'
import { useNotificationsQuery } from '@/hooks/use-notifications'
import { NOTIFICATION_STATUS_LABEL } from '@/types/notification'
import type { NotificationStatus } from '@/types/notification'

const PAGE_SIZE = 20

const STATUS_VARIANT: Record<NotificationStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SENT: 'default',
  FAILED: 'destructive',
}

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useNotificationsQuery({ page })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">แจ้งเตือนของฉัน</h1>

      {isLoading ? (
        <SectionLoading />
      ) : !data || data.results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Bell className="size-8" />
          <p>ยังไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.results.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{notification.notif_type}</span>
                    <Badge variant={STATUS_VARIANT[notification.status]}>
                      {NOTIFICATION_STATUS_LABEL[notification.status]}
                    </Badge>
                  </div>
                  <p className="text-sm">{notification.message}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(notification.created_at).toLocaleString('th-TH')}</span>
                    {notification.booking && (
                      <Link
                        to={`/app/bookings/${notification.booking.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {notification.booking.booking_number}
                      </Link>
                    )}
                    {notification.chick && (
                      <Link
                        to={`/app/chicks/${notification.chick.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {notification.chick.wing_clip_number}
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
