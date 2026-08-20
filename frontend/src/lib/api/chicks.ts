import { api } from '@/lib/api/client'
import type { Chick, ChickCreatePayload, ChickListParams } from '@/types/chick'
import type { PaginatedResponse } from '@/types/api'

export async function listChicks(params: ChickListParams): Promise<PaginatedResponse<Chick>> {
  const { data } = await api.get<PaginatedResponse<Chick>>('/chicks/', { params })
  return data
}

export async function getChick(id: number): Promise<Chick> {
  const { data } = await api.get<Chick>(`/chicks/${id}/`)
  return data
}

/** wing_clip_number is auto-generated server-side (apps.core.services.next_running_number) — never sent by the client. */
export async function createChick(payload: ChickCreatePayload): Promise<Chick> {
  const { data } = await api.post<Chick>('/chicks/', payload)
  return data
}
