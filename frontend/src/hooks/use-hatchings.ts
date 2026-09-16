import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeHatching, listHatchings, startHatching } from '@/lib/api/hatchings'
import type { HatchingCompletePayload, HatchingListParams } from '@/types/hatching'

export function useHatchingsQuery(params: HatchingListParams) {
  return useQuery({
    queryKey: ['hatchings', params],
    queryFn: () => listHatchings(params),
    enabled: Boolean(params.egg) || Boolean(params.booking),
  })
}

export function useStartHatching() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startHatching,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hatchings'] }),
  })
}

export function useCompleteHatching() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HatchingCompletePayload }) =>
      completeHatching(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hatchings'] }),
  })
}
