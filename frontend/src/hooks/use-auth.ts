import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { login as loginRequest, logout as logoutRequest } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import type { LoginPayload } from '@/types/auth'

export function useLogin() {
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { user, ...tokens } = await loginRequest(payload)
      setTokens(tokens)
      setUser(user)
      return user
    },
    onSuccess: (user) => {
      navigate(user.role === 'ADMIN' ? '/admin' : '/app', { replace: true })
    },
  })
}

export function useLogout() {
  const clear = useAuthStore((state) => state.clear)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        await logoutRequest(refreshToken)
      }
    },
    onSettled: () => {
      clear()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isAuthenticated = Boolean(useAuthStore((state) => state.accessToken) && user)
  return { user, isInitialized, isAuthenticated }
}
