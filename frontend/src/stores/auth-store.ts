import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthTokens, User } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  /** True once the app-load /auth/me check has resolved (success or failure). */
  isInitialized: boolean
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: User | null) => void
  setInitialized: (value: boolean) => void
  clear: () => void
}

/**
 * Tokens are persisted to localStorage so a page refresh doesn't force a re-login,
 * but `user`/role is never trusted from this cache alone — see routes/RequireRole,
 * which always re-verifies against GET /auth/me before granting access.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isInitialized: false,
      setTokens: (tokens) => set({ accessToken: tokens.access, refreshToken: tokens.refresh }),
      setUser: (user) => set({ user }),
      setInitialized: (value) => set({ isInitialized: value }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'gamecock-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
