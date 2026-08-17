import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import type { Role } from '@/types/auth'

/** Blocks unauthenticated access. AuthBootstrap has already resolved isInitialized by the time this renders. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

/**
 * Gates by role using `user.role` as populated by GET /auth/me (see AuthBootstrap /
 * useLogin) — never a role value read from anywhere else, so a stale or tampered
 * client-side value can't grant access to the other role's routes.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()

  if (user?.role !== role) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/app'} replace />
  }

  return <Outlet />
}
