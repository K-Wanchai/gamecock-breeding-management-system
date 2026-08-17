import { api } from '@/lib/api/client'
import type {
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  PasswordResetConfirmPayload,
  ProfileUpdatePayload,
  RegisterPayload,
  User,
} from '@/types/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>('/auth/register/', payload)
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me/')
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout/', { refresh: refreshToken })
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  const { data } = await api.patch<User>('/auth/profile/', payload)
  return data
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post('/auth/change-password/', payload)
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password-reset/request/', { email })
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
  await api.post('/auth/password-reset/confirm/', payload)
}
