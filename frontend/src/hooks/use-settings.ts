import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFarmSetting, updateFarmSetting } from '@/lib/api/settings'

export function useFarmSettingQuery() {
  return useQuery({
    queryKey: ['farm-setting'],
    queryFn: getFarmSetting,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateFarmSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateFarmSetting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farm-setting'] }),
  })
}
