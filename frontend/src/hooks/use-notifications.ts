import { useMutation, useQuery } from '@tanstack/react-query'
import { requestLineLinkCode, listNotifications } from '@/lib/api/notifications'
import type { NotificationListParams } from '@/types/notification'

export function useNotificationsQuery(params: NotificationListParams) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => listNotifications(params),
  })
}

export function useRequestLineLinkCode() {
  return useMutation({
    mutationFn: requestLineLinkCode,
  })
}
