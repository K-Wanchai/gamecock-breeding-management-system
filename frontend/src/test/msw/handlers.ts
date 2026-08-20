import type { HttpHandler } from 'msw'

/**
 * No default handlers on purpose — every test registers exactly the endpoints it
 * exercises via `server.use(...)` (see src/test/msw/server.ts). `onUnhandledRequest:
 * 'error'` in src/test/setup.ts makes any un-mocked request fail the test loudly
 * instead of silently hanging, which is what we want: an integration test should
 * declare its full API surface.
 */
export const handlers: HttpHandler[] = []
