import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createHealthRecord, listHealthRecords } from '@/lib/api/health'
import type { HealthRecordListParams } from '@/types/health'

/** No `enabled` gate — an unfiltered call is meaningful too (farm-wide admin browse), the backend's own ownership scoping already restricts what a non-admin caller sees. */
export function useHealthRecordsQuery(params: HealthRecordListParams) {
  return useQuery({
    queryKey: ['health-records', params],
    queryFn: () => listHealthRecords(params),
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
