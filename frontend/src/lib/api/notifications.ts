import { api } from '@/lib/api/client'
import type { LineLinkCode, Notification, NotificationListParams } from '@/types/notification'
import type { PaginatedResponse } from '@/types/api'

export async function listNotifications(
  params: NotificationListParams,
): Promise<PaginatedResponse<Notification>> {
  const { data } = await api.get<PaginatedResponse<Notification>>('/notifications/', { params })
  return data
}

export async function requestLineLinkCode(): Promise<LineLinkCode> {
  const { data } = await api.post<LineLinkCode>('/notifications/line/link-code/')
  return data
}
