import { api } from '@/lib/api/client'
import type { Vaccination, VaccinationCreatePayload, VaccinationListParams } from '@/types/vaccination'
import type { PaginatedResponse } from '@/types/api'

export async function listVaccinations(
  params: VaccinationListParams,
): Promise<PaginatedResponse<Vaccination>> {
  const { data } = await api.get<PaginatedResponse<Vaccination>>('/vaccinations/', { params })
  return data
}

export async function createVaccination(payload: VaccinationCreatePayload): Promise<Vaccination> {
  const { data } = await api.post<Vaccination>('/vaccinations/', payload)
  return data
}
