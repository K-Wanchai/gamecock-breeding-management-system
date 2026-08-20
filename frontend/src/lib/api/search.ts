import { api } from '@/lib/api/client'
import type { BookingSearchResult, SearchParams } from '@/types/search'
import type { PaginatedResponse } from '@/types/api'

export async function search(params: SearchParams): Promise<PaginatedResponse<BookingSearchResult>> {
  const { data } = await api.get<PaginatedResponse<BookingSearchResult>>('/search/', { params })
  return data
}
