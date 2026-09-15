import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createVaccination,
  listVaccinations,
  listVaccinePresets,
  createVaccinePreset,
  deleteVaccinePreset,
} from '@/lib/api/vaccinations'
import type { VaccinationListParams } from '@/types/vaccination'

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

export function useVaccinePresetsQuery() {
  return useQuery({
    queryKey: ['vaccine-presets'],
    queryFn: listVaccinePresets,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateVaccinePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVaccinePreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccine-presets'] }),
  })
}

export function useDeleteVaccinePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVaccinePreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccine-presets'] }),
  })
}
