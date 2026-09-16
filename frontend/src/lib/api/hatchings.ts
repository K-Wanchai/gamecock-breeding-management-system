import { api } from '@/lib/api/client'
import type {
  Hatching,
  HatchingCompletePayload,
  HatchingListParams,
  HatchingStartPayload,
} from '@/types/hatching'
import type { PaginatedResponse } from '@/types/api'

export async function listHatchings(
  params: HatchingListParams,
): Promise<PaginatedResponse<Hatching>> {
  const { booking, ...rest } = params
  const apiParams = { ...rest, ...(booking != null ? { 'egg__booking': booking } : {}) }
  const { data } = await api.get<PaginatedResponse<Hatching>>('/hatchings/', { params: apiParams })
  return data
}

/** total_eggs is snapshotted server-side from egg.total_eggs — never sent by the client. */
export async function startHatching(payload: HatchingStartPayload): Promise<Hatching> {
  const { data } = await api.post<Hatching>('/hatchings/', payload)
  return data
}

export async function completeHatching(id: number, payload: HatchingCompletePayload): Promise<Hatching> {
  const { data } = await api.patch<Hatching>(`/hatchings/${id}/complete/`, payload)
  return data
}
