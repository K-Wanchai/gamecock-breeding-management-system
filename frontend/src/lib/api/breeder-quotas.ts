import { api } from '@/lib/api/client'
import type {
  BreederMonthlyQuota,
  BreederMonthlyQuotaFormValues,
  BreederMonthlyQuotaListParams,
} from '@/types/breeder-quota'
import type { PaginatedResponse } from '@/types/api'

export async function listBreederQuotas(
  params: BreederMonthlyQuotaListParams,
): Promise<PaginatedResponse<BreederMonthlyQuota>> {
  const { data } = await api.get<PaginatedResponse<BreederMonthlyQuota>>('/breeder-quotas/', {
    params,
  })
  return data
}

export async function createBreederQuota(
  breederId: number,
  values: BreederMonthlyQuotaFormValues,
): Promise<BreederMonthlyQuota> {
  const { data } = await api.post<BreederMonthlyQuota>('/breeder-quotas/', {
    breeder: breederId,
    year: Number(values.year),
    month: Number(values.month),
    max_slots: Number(values.max_slots),
    is_open: values.is_open,
  })
  return data
}

export async function updateBreederQuota(
  id: number,
  values: BreederMonthlyQuotaFormValues,
): Promise<BreederMonthlyQuota> {
  const { data } = await api.patch<BreederMonthlyQuota>(`/breeder-quotas/${id}/`, {
    year: Number(values.year),
    month: Number(values.month),
    max_slots: Number(values.max_slots),
    is_open: values.is_open,
  })
  return data
}

export async function deleteBreederQuota(id: number): Promise<void> {
  await api.delete(`/breeder-quotas/${id}/`)
}
