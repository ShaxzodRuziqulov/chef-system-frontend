import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Page } from '@/types'

export interface CommentDto {
  id:        number
  userId:    string
  userName:  string
  content:   string
  createdAt: string
  mine:      boolean
}

export const commentsApi = {
  /** GET /api/recipes/:id/comments — izohlar ro'yxati (sahifalangan) */
  getAll: (
    recipeId: number,
    params?: { page?: number; size?: number }
  ): Promise<AxiosResponse<ApiResponse<Page<CommentDto>>>> =>
    api.get(`/recipes/${recipeId}/comments`, { params }),

  /** POST /api/recipes/:id/comments — yangi izoh */
  add: (recipeId: number, content: string): Promise<AxiosResponse<ApiResponse<CommentDto>>> =>
    api.post(`/recipes/${recipeId}/comments`, { content }),

  /** DELETE /api/recipes/:id/comments/:commentId — izohni o'chirish */
  delete: (recipeId: number, commentId: number): Promise<AxiosResponse<ApiResponse<void>>> =>
    api.delete(`/recipes/${recipeId}/comments/${commentId}`),
}
