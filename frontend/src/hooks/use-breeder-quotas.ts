import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBreederQuota,
  deleteBreederQuota,
  listBreederQuotas,
  updateBreederQuota,
} from '@/lib/api/breeder-quotas'
import type {
  BreederMonthlyQuotaFormValues,
  BreederMonthlyQuotaListParams,
} from '@/types/breeder-quota'

export function useBreederQuotasQuery(params: BreederMonthlyQuotaListParams) {
  return useQuery({
    queryKey: ['breeder-quotas', params],
    queryFn: () => listBreederQuotas(params),
    enabled: Boolean(params.breeder),
  })
}

export function useCreateBreederQuota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      breederId,
      values,
    }: {
      breederId: number
      values: BreederMonthlyQuotaFormValues
    }) => createBreederQuota(breederId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeder-quotas'] }),
  })
}

export function useUpdateBreederQuota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: BreederMonthlyQuotaFormValues }) =>
      updateBreederQuota(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeder-quotas'] }),
  })
}

export function useDeleteBreederQuota() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBreederQuota,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeder-quotas'] }),
  })
}
