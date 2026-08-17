import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function RootRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/app'} replace />
}
