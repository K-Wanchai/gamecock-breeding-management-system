import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createHen, deleteHen, listHens, updateHen, updateHenStatus } from '@/lib/api/hens'
import type { Hen, HenFormValues, HenListParams } from '@/types/hen'

const hensKey = (params: HenListParams) => ['hens', params] as const

export function useHensQuery(params: HenListParams) {
  return useQuery({
    queryKey: hensKey(params),
    queryFn: () => listHens(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateHen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createHen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hens'] }),
  })
}

export function useUpdateHen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: HenFormValues }) => updateHen(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hens'] }),
  })
}

export function useUpdateHenStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Hen['status'] }) =>
      updateHenStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hens'] }),
  })
}

export function useDeleteHen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteHen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hens'] }),
  })
}
