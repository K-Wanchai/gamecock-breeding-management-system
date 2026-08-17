import { useQuery } from '@tanstack/react-query'
import { listHatchings } from '@/lib/api/hatchings'
import type { HatchingListParams } from '@/types/hatching'

export function useHatchingsQuery(params: HatchingListParams) {
  return useQuery({
    queryKey: ['hatchings', params],
    queryFn: () => listHatchings(params),
    enabled: Boolean(params.egg),
  })
}
