import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBreeder,
  deleteBreeder,
  getBreeder,
  listBreeders,
  updateBreeder,
} from '@/lib/api/breeders'
import type { BreederFormValues, BreederListParams } from '@/types/breeder'

export function useBreedersQuery(params: BreederListParams) {
  return useQuery({
    queryKey: ['breeders', params],
    queryFn: () => listBreeders(params),
    placeholderData: keepPreviousData,
  })
}

export function useBreederQuery(id: number) {
  return useQuery({
    queryKey: ['breeders', 'detail', id],
    queryFn: () => getBreeder(id),
  })
}

export function useCreateBreeder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBreeder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeders'] }),
  })
}

export function useUpdateBreeder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: BreederFormValues }) =>
      updateBreeder(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeders'] }),
  })
}

export function useDeleteBreeder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBreeder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['breeders'] }),
  })
}
