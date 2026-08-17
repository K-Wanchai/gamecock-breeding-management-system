import { api } from '@/lib/api/client'
import type { Breeder, BreederFormValues, BreederListParams } from '@/types/breeder'
import type { PaginatedResponse } from '@/types/api'

export async function listBreeders(params: BreederListParams): Promise<PaginatedResponse<Breeder>> {
  const { data } = await api.get<PaginatedResponse<Breeder>>('/breeders/', { params })
  return data
}

export async function getBreeder(id: number): Promise<Breeder> {
  const { data } = await api.get<Breeder>(`/breeders/${id}/`)
  return data
}

/** Only sends fields with a value — optional text fields left blank simply aren't included rather than sent as "". */
function toFormData(values: BreederFormValues): FormData {
  const formData = new FormData()
  formData.append('name', values.name)
  formData.append('service_rate', values.service_rate)
  formData.append('default_monthly_quota', values.default_monthly_quota)
  formData.append('status', values.status)
  if (values.breed) formData.append('breed', values.breed)
  if (values.bloodline) formData.append('bloodline', values.bloodline)
  if (values.description) formData.append('description', values.description)
  if (values.service_start_date) formData.append('service_start_date', values.service_start_date)
  if (values.image) formData.append('image', values.image)
  return formData
}

export async function createBreeder(values: BreederFormValues): Promise<Breeder> {
  const { data } = await api.post<Breeder>('/breeders/', toFormData(values))
  return data
}

export async function updateBreeder(id: number, values: BreederFormValues): Promise<Breeder> {
  const { data } = await api.patch<Breeder>(`/breeders/${id}/`, toFormData(values))
  return data
}

export async function deleteBreeder(id: number): Promise<void> {
  await api.delete(`/breeders/${id}/`)
}
