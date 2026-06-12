import api from './axios'
import type { AxiosResponse }         from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthTokenResponse,
  AuthResponse,
  AuthUserResponse,
  TokenPairResponse,
  RefreshRequest,
} from '@/types'

export const authApi = {
  /** Ro'yxatdan o'tish → ApiResponse<AuthResponse> */
  register: (
    data: RegisterRequest,
  ): Promise<AxiosResponse<ApiResponse<AuthResponse>>> =>
    api.post('/auth/register', data),

  /** Kirish → ApiResponse<AuthTokenResponse> */
  login: (
    data: LoginRequest,
  ): Promise<AxiosResponse<ApiResponse<AuthTokenResponse>>> =>
    api.post('/auth/login', data),

  /** Token yangilash → ApiResponse<TokenPairResponse> */
  refresh: (
    data: RefreshRequest,
  ): Promise<AxiosResponse<ApiResponse<TokenPairResponse>>> =>
    api.post('/auth/refresh', data),

  /** Joriy foydalanuvchi → ApiResponse<AuthUserResponse> */
  me: (): Promise<AxiosResponse<ApiResponse<AuthUserResponse>>> =>
    api.get('/auth/me'),

  /** Profil yangilash → ApiResponse<AuthUserResponse> */
  updateProfile: (
    data: { fullName?: string; avatarUrl?: string },
  ): Promise<AxiosResponse<ApiResponse<AuthUserResponse>>> =>
    api.put('/auth/profile', data),

  /** Parol o'zgartirish */
  changePassword: (
    data: { currentPassword: string; newPassword: string },
  ): Promise<AxiosResponse<void>> =>
    api.put('/auth/password', data),

  /** Chiqish */
  logout: (
    refreshToken: string,
  ): Promise<AxiosResponse<void>> =>
    api.post('/auth/logout', { refresh_token: refreshToken }),

  /** Username va yangi parol orqali parolni tiklash (emailsiz) */
  forgotPassword: (
    data: { username: string; newPassword: string },
  ): Promise<AxiosResponse<ApiResponse<string>>> =>
    api.post('/auth/forgot-password', data),
}
