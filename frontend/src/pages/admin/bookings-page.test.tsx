import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTestQueryClient, render, screen, waitFor, within } from '@/test/test-utils'
import { server } from '@/test/msw/server'
import { AdminBookingsPage } from '@/pages/admin/bookings-page'
import type { Booking } from '@/types/booking'

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    booking_number: 'BK-69-00001',
    customer: { id: 2, username: 'smoketest' },
    hen: { id: 1, name: 'Hen Star', breed: 'Thai Native' },
    breeder: { id: 1, name: 'Breeder Gold', breed: 'Thai Native', service_rate: '3000.00' },
    booking_date: '2026-08-30',
    booking_year: 2026,
    booking_month: 8,
    queue_no: 1,
    price: '3000.00',
    deposit_amount: '900.00',
    paid_amount: '900.00',
    remaining_amount: '3000.00',
    status: 'PAID',
    current_breeding_stage: null,
    latest_breeding_status: null,
    note: null,
    requested_at: '2026-08-20T00:00:00Z',
    approved_at: null,
    locked_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AdminBookingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminBookingsPage', () => {
  it('renders the fetched bookings in a table', async () => {
    server.use(
      http.get(`${API_BASE}/bookings/`, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [makeBooking()] }),
      ),
    )

    renderPage()

    expect(await screen.findByText('BK-69-00001')).toBeInTheDocument()
    expect(screen.getByText('smoketest')).toBeInTheDocument()
    expect(screen.getByText('Hen Star')).toBeInTheDocument()
  })

  it('shows the empty state when there are no bookings', async () => {
    server.use(
      http.get(`${API_BASE}/bookings/`, () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    )

    renderPage()

    expect(await screen.findByText('ไม่พบรายการจอง')).toBeInTheDocument()
  })

  it('shows the "Approve" action only for a PAID booking, and approving it calls the approve endpoint', async () => {
    const booking = makeBooking({ status: 'PAID' })
    let approveCalled = false

    server.use(
      http.get(`${API_BASE}/bookings/`, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [booking] }),
      ),
      http.patch(`${API_BASE}/bookings/${booking.id}/approve/`, () => {
        approveCalled = true
        return HttpResponse.json({ ...booking, status: 'APPROVED' })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    const row = (await screen.findByText('BK-69-00001')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'อนุมัติ' }))

    // Confirm dialog appears — click the confirm action.
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'ยืนยันอนุมัติ' }))

    await waitFor(() => expect(approveCalled).toBe(true))
  })

  it('does not show the "Approve" action for a PENDING booking', async () => {
    server.use(
      http.get(`${API_BASE}/bookings/`, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [makeBooking({ status: 'PENDING' })],
        }),
      ),
    )

    renderPage()

    const row = (await screen.findByText('BK-69-00001')).closest('tr')!
    expect(within(row).queryByRole('button', { name: 'อนุมัติ' })).not.toBeInTheDocument()
  })
})
