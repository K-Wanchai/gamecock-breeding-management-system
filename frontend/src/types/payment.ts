export type PaymentType = 'DEPOSIT' | 'FULL' | 'ADDITIONAL'
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface PaymentBookingSummary {
  id: number
  booking_number: string
  status: string
  price: string
  remaining_amount: string
}

/** amount serializes as a string (DRF DecimalField). */
export interface Payment {
  id: number
  payment_number: string
  booking: PaymentBookingSummary
  payment_type: PaymentType
  amount: string
  slip: string
  paid_at: string
  status: PaymentStatus
  verified_by: number | null
  verified_at: string | null
  remark: string | null
  created_at: string
  updated_at: string
}

/** Form-facing shape — amount/paid_at stay strings while the user is typing. */
export interface PaymentFormValues {
  payment_type: PaymentType
  amount: string
  paid_at: string
  slip: File | null
}

export interface PaymentListParams {
  page?: number
  status?: PaymentStatus | ''
  payment_type?: PaymentType | ''
  booking?: number
  search?: string
}
