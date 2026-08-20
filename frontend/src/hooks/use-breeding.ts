import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBreedingEvent, createEgg, listBreedingEvents, listEggs } from '@/lib/api/breeding'
import type { BreedingEventListParams, EggListParams } from '@/types/breeding'

export function useBreedingEventsQuery(params: BreedingEventListParams) {
  return useQuery({
    queryKey: ['breeding-events', params],
    queryFn: () => listBreedingEvents(params),
    enabled: Boolean(params.booking),
  })
}

export function useCreateBreedingEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBreedingEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeding-events'] }),
  })
}

export function useEggsQuery(params: EggListParams) {
  return useQuery({
    queryKey: ['eggs', params],
    queryFn: () => listEggs(params),
    enabled: Boolean(params.booking),
  })
}

export function useCreateEgg() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEgg,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eggs'] }),
  })
}
