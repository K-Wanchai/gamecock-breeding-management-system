import { api } from '@/lib/api/client'
import type { Hen, HenFormValues, HenListParams } from '@/types/hen'
import type { PaginatedResponse } from '@/types/api'

export async function listHens(params: HenListParams): Promise<PaginatedResponse<Hen>> {
  const { data } = await api.get<PaginatedResponse<Hen>>('/hens/', { params })
  return data
}

/**
 * Builds multipart form data from the form's string-typed values, sending only fields
 * that have a value — optional text fields left blank simply aren't included rather
 * than being sent as "" (age_months in particular: DRF's IntegerField rejects "").
 * Trade-off: this means clearing a previously-set optional field isn't possible from
 * the edit form yet, only replacing it with another value.
 */
function toFormData(values: HenFormValues): FormData {
  const formData = new FormData()
  formData.append('name', values.name)
  formData.append('status', values.status)
  if (values.breed) formData.append('breed', values.breed)
  if (values.bloodline) formData.append('bloodline', values.bloodline)
  if (values.age_months) formData.append('age_months', values.age_months)
  if (values.history) formData.append('history', values.history)
  if (values.image) formData.append('image', values.image)
  return formData
}

export async function createHen(values: HenFormValues): Promise<Hen> {
  const { data } = await api.post<Hen>('/hens/', toFormData(values))
  return data
}

export async function updateHen(id: number, values: HenFormValues): Promise<Hen> {
  const { data } = await api.patch<Hen>(`/hens/${id}/`, toFormData(values))
  return data
}

export async function updateHenStatus(id: number, status: Hen['status']): Promise<Hen> {
  const { data } = await api.patch<Hen>(`/hens/${id}/`, { status })
  return data
}

export async function deleteHen(id: number): Promise<void> {
  await api.delete(`/hens/${id}/`)
}
