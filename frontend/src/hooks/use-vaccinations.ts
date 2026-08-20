import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createVaccination, listVaccinations } from '@/lib/api/vaccinations'
import type { VaccinationListParams } from '@/types/vaccination'

/** No `enabled` gate — an unfiltered call is meaningful too (farm-wide admin browse), the backend's own ownership scoping already restricts what a non-admin caller sees. */
export function useVaccinationsQuery(params: VaccinationListParams) {
  return useQuery({
    queryKey: ['vaccinations', params],
    queryFn: () => listVaccinations(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVaccination,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] }),
  })
}
