import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import { server } from '@/test/msw/server'
import { LoginPage } from '@/pages/auth/login-page'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth-store'

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`

function renderLoginPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin Home</div>} />
          <Route path="/app" element={<div>Customer Home</div>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockUser(role: 'ADMIN' | 'CUSTOMER') {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    phone: '',
    first_name: '',
    last_name: '',
    role,
    is_active: true,
    date_joined: '2026-01-01T00:00:00Z',
  }
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
  })

  it('logs in an admin and navigates to /admin', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login/`, async ({ request }) => {
        const body = (await request.json()) as { username: string; password: string }
        expect(body).toEqual({ username: 'admin', password: 'Test1234!' })
        return HttpResponse.json({
          access: 'fake-access-token',
          refresh: 'fake-refresh-token',
          user: mockUser('ADMIN'),
        })
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('ชื่อผู้ใช้'), 'admin')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'Test1234!')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => expect(screen.getByText('Admin Home')).toBeInTheDocument())
    expect(useAuthStore.getState().accessToken).toBe('fake-access-token')
  })

  it('logs in a customer and navigates to /app', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login/`, () =>
        HttpResponse.json({
          access: 'fake-access-token',
          refresh: 'fake-refresh-token',
          user: mockUser('CUSTOMER'),
        }),
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('ชื่อผู้ใช้'), 'smoketest')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'Test1234!')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => expect(screen.getByText('Customer Home')).toBeInTheDocument())
  })

  it('shows an error toast and stays on the login page when credentials are rejected', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login/`, () =>
        HttpResponse.json(
          { error: { code: 'INVALID_CREDENTIALS', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' } },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('ชื่อผู้ใช้'), 'admin')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => expect(screen.getByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('shows a rate-limit specific message on a 429 response', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login/`, () =>
        HttpResponse.json({ error: { code: 'THROTTLED', message: 'Request was throttled.' } }, { status: 429 }),
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('ชื่อผู้ใช้'), 'admin')
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'Test1234!')
    await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() => expect(screen.getByText('พยายามเข้าสู่ระบบบ่อยเกินไป')).toBeInTheDocument())
  })
})
