import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBreedingEvent, createEgg, createInseminationRecord,
  listBreedingEvents, listEggs, listInseminationRecords,
} from '@/lib/api/breeding'
import type { BreedingEventListParams, EggListParams, InseminationRecordListParams } from '@/types/breeding'

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding-events'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
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

export function useInseminationRecordsQuery(params: InseminationRecordListParams) {
  return useQuery({
    queryKey: ['insemination-records', params],
    queryFn: () => listInseminationRecords(params),
    enabled: Boolean(params.booking),
  })
}

export function useCreateInseminationRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInseminationRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insemination-records'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
