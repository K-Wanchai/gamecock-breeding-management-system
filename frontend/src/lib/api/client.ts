import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { normalizeApiError } from '@/lib/api/errors'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1`

export const api = axios.create({
  baseURL: API_BASE_URL,
})

/** Plain client with no interceptors, used only for the refresh call itself to avoid recursive 401 handling. */
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// Concurrent 401s share one in-flight refresh instead of each firing their own.
let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = useAuthStore.getState().refreshToken
    refreshPromise = refreshClient
      .post<{ access: string }>('/auth/refresh/', { refresh: refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setTokens({ access: data.access, refresh: refreshToken! })
        return data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh/')

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retried &&
      !isRefreshCall &&
      useAuthStore.getState().refreshToken
    ) {
      originalRequest._retried = true
      try {
        const newAccessToken = await refreshAccessToken()
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
        return api(originalRequest)
      } catch {
        useAuthStore.getState().clear()
        window.location.assign('/login')
        return Promise.reject(normalizeApiError(error))
      }
    }

    return Promise.reject(normalizeApiError(error))
  },
)
