import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveBooking, cancelBooking, createBooking, getBooking, getBookingTimeline, listBookings } from '@/lib/api/bookings'
import type { BookingListParams } from '@/types/booking'

export function useBookingsQuery(params: BookingListParams) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => listBookings(params),
    placeholderData: keepPreviousData,
  })
}

export function useBookingQuery(id: number) {
  return useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: () => getBooking(id),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => cancelBooking(id, reason),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.setQueryData(['bookings', 'detail', booking.id], booking)
    },
  })
}

export function useBookingTimelineQuery(id: number) {
  return useQuery({
    queryKey: ['bookings', 'timeline', id],
    queryFn: () => getBookingTimeline(id),
    enabled: Boolean(id),
  })
}

export function useApproveBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => approveBooking(id),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.setQueryData(['bookings', 'detail', booking.id], booking)
    },
  })
}
