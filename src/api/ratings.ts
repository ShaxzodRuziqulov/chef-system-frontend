import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

export interface RatingResult {
  myScore:       number   // 0 = hali baholanmagan
  averageRating: number
  ratingCount:   number
}

export const ratingsApi = {
  /** POST /api/recipes/:id/ratings — baho qo'yish yoki yangilash */
  rate: (recipeId: number, score: number): Promise<AxiosResponse<ApiResponse<RatingResult>>> =>
    api.post(`/recipes/${recipeId}/ratings`, { score }),

  /** GET /api/recipes/:id/ratings/me — mening bahom + o'rtacha */
  getMyRating: (recipeId: number): Promise<AxiosResponse<ApiResponse<RatingResult>>> =>
    api.get(`/recipes/${recipeId}/ratings/me`),
}
