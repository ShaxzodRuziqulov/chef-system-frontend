import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Page, RecipeDto } from '@/types'

export const favoritesApi = {
  /** POST /api/favorites/:id — sevimlilarga qo'shish/o'chirish (toggle) */
  toggle: (recipeId: number): Promise<AxiosResponse<ApiResponse<{ favorited: boolean }>>> =>
    api.post(`/favorites/${recipeId}`),

  /** GET /api/favorites/ids — foydalanuvchining sevimli ID lari */
  getIds: (): Promise<AxiosResponse<ApiResponse<number[]>>> =>
    api.get('/favorites/ids'),

  /** GET /api/favorites — saqlangan retseptlar (sahifalangan) */
  getAll: (params?: { page?: number; size?: number }): Promise<AxiosResponse<ApiResponse<Page<RecipeDto>>>> =>
    api.get('/favorites', { params }),
}
