import { useQuery } from '@tanstack/react-query'
import { listHealthRecords } from '@/lib/api/health'
import type { HealthRecordListParams } from '@/types/health'

export function useHealthRecordsQuery(params: HealthRecordListParams) {
  return useQuery({
    queryKey: ['health-records', params],
    queryFn: () => listHealthRecords(params),
    enabled: Boolean(params.chick),
  })
}
