import { api } from '@/lib/api/client'
import type { BreedingEvent, BreedingEventListParams, Egg, EggListParams } from '@/types/breeding'
import type { PaginatedResponse } from '@/types/api'

/** Read-only for CUSTOMER — apps.breeding viewsets expose create/list/retrieve only, and writes are ADMIN-only. */
export async function listBreedingEvents(
  params: BreedingEventListParams,
): Promise<PaginatedResponse<BreedingEvent>> {
  const { data } = await api.get<PaginatedResponse<BreedingEvent>>('/breeding-events/', { params })
  return data
}

export async function listEggs(params: EggListParams): Promise<PaginatedResponse<Egg>> {
  const { data } = await api.get<PaginatedResponse<Egg>>('/eggs/', { params })
  return data
}
