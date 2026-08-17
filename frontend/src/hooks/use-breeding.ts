import { useQuery } from '@tanstack/react-query'
import { listBreedingEvents, listEggs } from '@/lib/api/breeding'
import type { BreedingEventListParams, EggListParams } from '@/types/breeding'

export function useBreedingEventsQuery(params: BreedingEventListParams) {
  return useQuery({
    queryKey: ['breeding-events', params],
    queryFn: () => listBreedingEvents(params),
    enabled: Boolean(params.booking),
  })
}

export function useEggsQuery(params: EggListParams) {
  return useQuery({
    queryKey: ['eggs', params],
    queryFn: () => listEggs(params),
    enabled: Boolean(params.booking),
  })
}
