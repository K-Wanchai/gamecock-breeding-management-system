import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { search } from '@/lib/api/search'
import type { SearchParams } from '@/types/search'

export function useSearchQuery(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => search(params),
    placeholderData: keepPreviousData,
  })
}
