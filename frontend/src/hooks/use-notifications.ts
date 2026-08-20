import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestLineLinkCode, listNotifications, retryNotification } from '@/lib/api/notifications'
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

export function useRetryNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: retryNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
