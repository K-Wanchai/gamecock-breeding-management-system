import { api } from '@/lib/api/client'
import type { Vaccination, VaccinationListParams } from '@/types/vaccination'
import type { PaginatedResponse } from '@/types/api'

export async function listVaccinations(
  params: VaccinationListParams,
): Promise<PaginatedResponse<Vaccination>> {
  const { data } = await api.get<PaginatedResponse<Vaccination>>('/vaccinations/', { params })
  return data
}
