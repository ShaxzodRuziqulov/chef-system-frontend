import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Page } from '@/types'

export interface IngredientDto {
  id:          number
  nameUz:      string
  nameRu?:     string
  nameEng?:    string
  imageUrl?:   string
  defaultUnit?: string
}

type IngredientPageResponse = AxiosResponse<ApiResponse<Page<IngredientDto>>>

export const ingredientsApi = {
  getAll: (params?: { page?: number; size?: number }): Promise<IngredientPageResponse> =>
    api.get('/ingredients', { params }),

  search: (keyword: string, params?: { page?: number; size?: number }): Promise<IngredientPageResponse> =>
    api.get('/ingredients/search', { params: { keyword, ...params } }),
}
