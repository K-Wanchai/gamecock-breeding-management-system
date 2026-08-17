import { useEffect } from 'react'
import { fetchMe } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import { FullPageLoading } from '@/components/shared/loading'

/**
 * Runs once on app load: if a token is cached, re-verifies it (and the role that
 * comes with it) against GET /auth/me rather than trusting the persisted store,
 * since a role stored client-side could be stale or tampered with.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const setUser = useAuthStore((state) => state.setUser)
  const setInitialized = useAuthStore((state) => state.setInitialized)
  const clear = useAuthStore((state) => state.clear)

  useEffect(() => {
    if (isInitialized) return

    if (!accessToken) {
      setInitialized(true)
      return
    }

    fetchMe()
      .then((user) => setUser(user))
      .catch(() => clear())
      .finally(() => setInitialized(true))
    // Only ever runs once per app load — accessToken changes afterward (login/refresh)
    // must not re-trigger this bootstrap check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isInitialized) {
    return <FullPageLoading />
  }

  return children
}
