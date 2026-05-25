import api from './axios'
import type { ApiResponse } from '@/types'

export interface PlatformStats {
  totalRecipes: number
  totalUsers: number
  totalCategories: number
  topRecipes: TopRecipe[]
}

export interface TopRecipe {
  id: number
  titleUz: string
  titleRu: string | null
  titleEng: string | null
  imageUrl: string | null
  viewCount: number
  averageRating: number
}

export interface PlatformFeatures {
  publicFeatures: string[]
  memberFeatures: string[]
  bloggerFeatures: string[]
}

export const platformApi = {
  getStats: () => api.get<ApiResponse<PlatformStats>>('/stats'),
  getFeatures: () => api.get<ApiResponse<PlatformFeatures>>('/features'),
}
