import { api } from '@/lib/api/client'
import type { Chick, ChickListParams } from '@/types/chick'
import type { PaginatedResponse } from '@/types/api'

export async function listChicks(params: ChickListParams): Promise<PaginatedResponse<Chick>> {
  const { data } = await api.get<PaginatedResponse<Chick>>('/chicks/', { params })
  return data
}

export async function getChick(id: number): Promise<Chick> {
  const { data } = await api.get<Chick>(`/chicks/${id}/`)
  return data
}
