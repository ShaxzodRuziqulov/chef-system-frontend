import api from './axios'
import type { AxiosResponse }    from 'axios'
import type {
  ApiResponse,
  Page,
  RecipeDto,
  RecipeCreateRequest,
  RecipeUpdateRequest,
  DifficultyLevel,
} from '@/types'

interface RecipeParams {
  page?: number
  size?: number
  sort?: string | string[]
}

type RecipePageResponse = AxiosResponse<ApiResponse<Page<RecipeDto>>>
type RecipeResponse     = AxiosResponse<ApiResponse<RecipeDto>>

export const recipesApi = {
  getAll: (params?: RecipeParams): Promise<RecipePageResponse> =>
    api.get('/recipes', { params }),

  getById: (id: number | string): Promise<RecipeResponse> =>
    api.get(`/recipes/${id}`),

  search: (keyword: string, params?: RecipeParams): Promise<RecipePageResponse> =>
    api.get('/recipes/search', { params: { keyword, ...params } }),

  getByCategory: (categoryId: number | string, params?: RecipeParams): Promise<RecipePageResponse> =>
    api.get(`/recipes/category/${categoryId}`, { params }),

  getByDifficulty: (level: DifficultyLevel, params?: RecipeParams): Promise<RecipePageResponse> =>
    api.get(`/recipes/difficulty/${level}`, { params }),

  getMy: (params?: RecipeParams): Promise<RecipePageResponse> =>
    api.get('/recipes/my', { params }),

  create: (data: RecipeCreateRequest): Promise<RecipeResponse> =>
    api.post('/recipes', data),

  update: (id: number, data: RecipeUpdateRequest): Promise<RecipeResponse> =>
    api.put(`/recipes/${id}`, data),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/recipes/${id}`),

  incrementView: (id: number | string): Promise<AxiosResponse<void>> =>
    api.post(`/recipes/${id}/view`),

  bulkImport: (file: File): Promise<AxiosResponse<any>> => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/recipes/bulk-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  bulkImportTemplate: (): Promise<AxiosResponse<Blob>> =>
    api.get('/admin/recipes/bulk-import/template', { responseType: 'blob' }),
}
