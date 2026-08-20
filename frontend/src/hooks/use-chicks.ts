import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createChick, getChick, listChicks } from '@/lib/api/chicks'
import type { ChickListParams } from '@/types/chick'

export function useChicksQuery(params: ChickListParams) {
  return useQuery({
    queryKey: ['chicks', params],
    queryFn: () => listChicks(params),
    placeholderData: keepPreviousData,
  })
}

export function useChickQuery(id: number) {
  return useQuery({
    queryKey: ['chicks', 'detail', id],
    queryFn: () => getChick(id),
  })
}

export function useCreateChick() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createChick,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chicks'] }),
  })
}
