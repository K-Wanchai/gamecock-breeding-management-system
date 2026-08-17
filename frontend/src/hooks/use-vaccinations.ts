import { useQuery } from '@tanstack/react-query'
import { listVaccinations } from '@/lib/api/vaccinations'
import type { VaccinationListParams } from '@/types/vaccination'

export function useVaccinationsQuery(params: VaccinationListParams) {
  return useQuery({
    queryKey: ['vaccinations', params],
    queryFn: () => listVaccinations(params),
    enabled: Boolean(params.chick),
  })
}
