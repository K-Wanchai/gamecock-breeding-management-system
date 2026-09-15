export type Role = 'ADMIN' | 'CUSTOMER'

export interface User {
  id: number
  username: string
  email: string
  phone: string
  first_name: string
  last_name: string
  role: Role
  is_active: boolean
  date_joined: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

/** POST /auth/login returns tokens plus the profile in one round trip. */
export interface LoginResponse extends AuthTokens {
  user: User
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  phone: string
  first_name: string
  last_name: string
  password: string
  password_confirm: string
}

export interface ProfileUpdatePayload {
  email: string
  phone: string
  first_name: string
  last_name: string
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export interface PasswordResetConfirmPayload {
  uid: string
  token: string
  new_password: string
}
