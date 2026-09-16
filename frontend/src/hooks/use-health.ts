import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createHealthRecord, listHealthRecords } from '@/lib/api/health'
import type { HealthRecordListParams } from '@/types/health'

export function useHealthRecordsQuery(params: HealthRecordListParams & { booking?: number }) {
  const { booking, ...rest } = params
  const apiParams = { ...rest, ...(booking != null ? { 'chick__booking': booking } : {}) }
  return useQuery({
    queryKey: ['health-records', params],
    queryFn: () => listHealthRecords(apiParams as HealthRecordListParams),
    placeholderData: keepPreviousData,
  })
}

export function useCreateHealthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createHealthRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health-records'] }),
  })
}
