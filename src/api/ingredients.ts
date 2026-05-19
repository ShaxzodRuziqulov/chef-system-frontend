import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, Page } from '@/types'

export interface IngredientDto {
  id:           number
  nameUz:       string
  nameRu?:      string
  nameEng?:     string
  imageUrl?:    string
  defaultUnit?: string
  description?: string
  allergen?:    boolean
}

export interface IngredientRequest {
  nameUz:       string
  nameRu?:      string
  nameEng?:     string
  description?: string
  imageUrl?:    string
  defaultUnit?: string
  allergen?:    boolean
}

type IngredientPageResponse = AxiosResponse<ApiResponse<Page<IngredientDto>>>
type IngredientResponse     = AxiosResponse<ApiResponse<IngredientDto>>

export const ingredientsApi = {
  getAll: (params?: { page?: number; size?: number }): Promise<IngredientPageResponse> =>
    api.get('/ingredients', { params }),

  search: (keyword: string, params?: { page?: number; size?: number }): Promise<IngredientPageResponse> =>
    api.get('/ingredients/search', { params: { keyword, ...params } }),

  getById: (id: number): Promise<IngredientResponse> =>
    api.get(`/ingredients/${id}`),

  create: (data: IngredientRequest): Promise<IngredientResponse> =>
    api.post('/ingredients', data),

  update: (id: number, data: IngredientRequest): Promise<IngredientResponse> =>
    api.put(`/ingredients/${id}`, data),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/ingredients/${id}`),
}
