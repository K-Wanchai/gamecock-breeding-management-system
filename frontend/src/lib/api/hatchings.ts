import { api } from '@/lib/api/client'
import type { Hatching, HatchingListParams } from '@/types/hatching'
import type { PaginatedResponse } from '@/types/api'

export async function listHatchings(
  params: HatchingListParams,
): Promise<PaginatedResponse<Hatching>> {
  const { data } = await api.get<PaginatedResponse<Hatching>>('/hatchings/', { params })
  return data
}
