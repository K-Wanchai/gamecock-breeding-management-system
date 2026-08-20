import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvePayment, createPayment, listPayments, rejectPayment } from '@/lib/api/payments'
import type { PaymentFormValues, PaymentListParams } from '@/types/payment'

export function usePaymentsQuery(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => listPayments(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, values }: { bookingId: number; values: PaymentFormValues }) =>
      createPayment(bookingId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })
}

export function useApprovePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, remark }: { id: number; remark?: string }) => approvePayment(id, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useRejectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, remark }: { id: number; remark?: string }) => rejectPayment(id, remark),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })
}
