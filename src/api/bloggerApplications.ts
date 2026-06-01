import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Page } from '@/types'

export interface BloggerApplicationDto {
  id: number
  user: {
    id: string
    username: string
    fullName: string
    avatarUrl?: string | null
    role: string
  }
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  adminNote?: string | null
  createdAt: string
  reviewedAt?: string | null
  reviewedBy?: { id: string; fullName: string } | null
}

export interface ReviewRequest {
  approve: boolean
  adminNote?: string
}

export const bloggerApplicationApi = {
  /** Oshpaz bo'lish uchun ariza yuborish (body yo'q) */
  apply: (): Promise<AxiosResponse<ApiResponse<BloggerApplicationDto>>> =>
    api.post('/blogger-applications'),

  /** O'z arizamning holati */
  getMyApplication: (): Promise<AxiosResponse<ApiResponse<BloggerApplicationDto>>> =>
    api.get('/blogger-applications/my'),

  /** Admin: kutayotgan arizalar */
  getPending: (page = 0, size = 20): Promise<AxiosResponse<ApiResponse<Page<BloggerApplicationDto>>>> =>
    api.get('/blogger-applications/pending', { params: { page, size, sort: 'createdAt,asc' } }),

  /** Admin: barcha arizalar */
  getAll: (page = 0, size = 20): Promise<AxiosResponse<ApiResponse<Page<BloggerApplicationDto>>>> =>
    api.get('/blogger-applications', { params: { page, size, sort: 'createdAt,desc' } }),

  /** Admin: tasdiqlash yoki rad etish */
  review: (id: number, data: ReviewRequest): Promise<AxiosResponse<ApiResponse<BloggerApplicationDto>>> =>
    api.post(`/blogger-applications/${id}/review`, data),
}
