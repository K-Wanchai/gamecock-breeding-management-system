import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests hit the REAL Django API (not mocked — see the vitest integration tests
 * for the mocked-API layer) at VITE_API_BASE_URL (frontend/.env, defaults to
 * http://localhost:8000). The backend must already be running separately —
 * `webServer` below only starts the Vite dev server, matching how this repo's dev
 * workflow already works (backend and frontend are started independently).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
