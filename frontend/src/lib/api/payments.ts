import { api } from '@/lib/api/client'
import type { Payment, PaymentFormValues, PaymentListParams } from '@/types/payment'
import type { PaginatedResponse } from '@/types/api'

export async function listPayments(params: PaymentListParams): Promise<PaginatedResponse<Payment>> {
  const { data } = await api.get<PaginatedResponse<Payment>>('/payments/', { params })
  return data
}

export async function createPayment(
  bookingId: number,
  values: PaymentFormValues,
): Promise<Payment> {
  const formData = new FormData()
  formData.append('booking', String(bookingId))
  formData.append('payment_type', values.payment_type)
  formData.append('amount', values.amount)
  formData.append('paid_at', new Date(values.paid_at).toISOString())
  if (values.slip) formData.append('slip', values.slip)
  const { data } = await api.post<Payment>('/payments/', formData)
  return data
}

/** ADMIN only — requires the payment to be PENDING (apps.payments.services.approve_payment/reject_payment). */
export async function approvePayment(id: number, remark?: string): Promise<Payment> {
  const { data } = await api.patch<Payment>(`/payments/${id}/approve/`, { remark })
  return data
}

export async function rejectPayment(id: number, remark?: string): Promise<Payment> {
  const { data } = await api.patch<Payment>(`/payments/${id}/reject/`, { remark })
  return data
}

/** Customer replaces the slip on a REJECTED payment — payment_number is preserved. */
export async function resubmitPayment(id: number, slip: File, paidAt: string): Promise<Payment> {
  const formData = new FormData()
  formData.append('slip', slip)
  formData.append('paid_at', new Date(paidAt).toISOString())
  const { data } = await api.patch<Payment>(`/payments/${id}/resubmit/`, formData)
  return data
}
