import { api } from '@/lib/api/client'
import type { Notification, NotificationListParams } from '@/types/notification'
import type { PaginatedResponse } from '@/types/api'

export async function listNotifications(
  params: NotificationListParams,
): Promise<PaginatedResponse<Notification>> {
  const { data } = await api.get<PaginatedResponse<Notification>>('/notifications/', { params })
  return data
}

/** ADMIN only — capped at MAX_RETRY_ATTEMPTS (3) server-side (apps.notifications.services.retry_notification). */
export async function retryNotification(id: number): Promise<Notification> {
  const { data } = await api.post<Notification>(`/notifications/${id}/retry/`)
  return data
}
