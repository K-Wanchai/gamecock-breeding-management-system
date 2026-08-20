import { api } from '@/lib/api/client'
import type { HealthRecord, HealthRecordCreatePayload, HealthRecordListParams } from '@/types/health'
import type { PaginatedResponse } from '@/types/api'

export async function listHealthRecords(
  params: HealthRecordListParams,
): Promise<PaginatedResponse<HealthRecord>> {
  const { data } = await api.get<PaginatedResponse<HealthRecord>>('/health-records/', { params })
  return data
}

export async function createHealthRecord(payload: HealthRecordCreatePayload): Promise<HealthRecord> {
  const { data } = await api.post<HealthRecord>('/health-records/', payload)
  return data
}
