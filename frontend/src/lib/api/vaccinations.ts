import { api } from '@/lib/api/client'
import type { Vaccination, VaccinationCreatePayload, VaccinationListParams } from '@/types/vaccination'
import type { PaginatedResponse } from '@/types/api'

export async function listVaccinations(
  params: VaccinationListParams,
): Promise<PaginatedResponse<Vaccination>> {
  const { booking, ...rest } = params
  const apiParams = { ...rest, ...(booking != null ? { 'chick__booking': booking } : {}) }
  const { data } = await api.get<PaginatedResponse<Vaccination>>('/vaccinations/', { params: apiParams })
  return data
}

export async function createVaccination(payload: VaccinationCreatePayload): Promise<Vaccination> {
  const { data } = await api.post<Vaccination>('/vaccinations/', payload)
  return data
}

export interface VaccinePreset {
  id: number
  name: string
}

export async function listVaccinePresets(): Promise<VaccinePreset[]> {
  const { data } = await api.get<VaccinePreset[]>('/vaccinations/presets/')
  return data
}

export async function createVaccinePreset(name: string): Promise<VaccinePreset> {
  const { data } = await api.post<VaccinePreset>('/vaccinations/presets/', { name })
  return data
}

export async function deleteVaccinePreset(id: number): Promise<void> {
  await api.delete(`/vaccinations/presets/${id}/`)
}
