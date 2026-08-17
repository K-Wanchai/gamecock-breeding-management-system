import { api } from '@/lib/api/client'
import type { HealthRecord, HealthRecordListParams } from '@/types/health'
import type { PaginatedResponse } from '@/types/api'

export async function listHealthRecords(
  params: HealthRecordListParams,
): Promise<PaginatedResponse<HealthRecord>> {
  const { data } = await api.get<PaginatedResponse<HealthRecord>>('/health-records/', { params })
  return data
}
