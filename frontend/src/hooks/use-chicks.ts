import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getChick, listChicks } from '@/lib/api/chicks'
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
