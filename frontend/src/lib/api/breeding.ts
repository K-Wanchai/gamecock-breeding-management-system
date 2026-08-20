import { api } from '@/lib/api/client'
import type {
  BreedingEvent,
  BreedingEventCreatePayload,
  BreedingEventListParams,
  Egg,
  EggCreatePayload,
  EggListParams,
} from '@/types/breeding'
import type { PaginatedResponse } from '@/types/api'

/** List/retrieve are open to CUSTOMER (read-only, scoped to their own bookings) — create is ADMIN-only, enforced server-side. */
export async function listBreedingEvents(
  params: BreedingEventListParams,
): Promise<PaginatedResponse<BreedingEvent>> {
  const { data } = await api.get<PaginatedResponse<BreedingEvent>>('/breeding-events/', { params })
  return data
}

export async function createBreedingEvent(payload: BreedingEventCreatePayload): Promise<BreedingEvent> {
  const { data } = await api.post<BreedingEvent>('/breeding-events/', payload)
  return data
}

export async function listEggs(params: EggListParams): Promise<PaginatedResponse<Egg>> {
  const { data } = await api.get<PaginatedResponse<Egg>>('/eggs/', { params })
  return data
}

export async function createEgg(payload: EggCreatePayload): Promise<Egg> {
  const { data } = await api.post<Egg>('/eggs/', payload)
  return data
}
