import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, listPayments } from '@/lib/api/payments'
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
