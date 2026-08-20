import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'

/** Fresh, retry-free QueryClient per test — retries would just slow failing-request tests down for no benefit. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * Wraps `ui` with a QueryClientProvider only — components that also need a Router
 * (anything using `useNavigate`/`Link`/route params) should be rendered inside their
 * own `<MemoryRouter>` in the test itself, since the right initial route/wrapping
 * `<Routes>` is test-specific.
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient }
}

export * from '@testing-library/react'
