import api from './axios'
import type { AxiosResponse }    from 'axios'
import type {
  ApiResponse,
  CategoryDto,
  CategoryRequest,
  TagDto,
  IngredientDto,
  Page,
} from '@/types'

interface TagRequest { nameUz: string; nameRu?: string; nameEng?: string; description?: string }

// ── Categories ────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<CategoryDto[]>>> =>
    api.get('/categories'),

  getById: (id: number): Promise<AxiosResponse<ApiResponse<CategoryDto>>> =>
    api.get(`/categories/${id}`),

  create: (data: CategoryRequest): Promise<AxiosResponse<ApiResponse<CategoryDto>>> =>
    api.post('/categories', data),

  update: (id: number, data: CategoryRequest): Promise<AxiosResponse<ApiResponse<CategoryDto>>> =>
    api.put(`/categories/${id}`, data),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/categories/${id}`),
}

// ── Tags ─────────────────────────────────────────────────────────
export const tagsApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<TagDto[]>>> =>
    api.get('/tags'),

  getById: (id: number): Promise<AxiosResponse<ApiResponse<TagDto>>> =>
    api.get(`/tags/${id}`),

  create: (data: TagRequest): Promise<AxiosResponse<ApiResponse<TagDto>>> =>
    api.post('/tags', data),

  update: (id: number, data: TagRequest): Promise<AxiosResponse<ApiResponse<TagDto>>> =>
    api.put(`/tags/${id}`, data),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/tags/${id}`),
}

// ── Ingredients ──────────────────────────────────────────────────
interface IngredientParams { page?: number; size?: number }

export const ingredientsApi = {
  getAll: (params?: IngredientParams): Promise<AxiosResponse<ApiResponse<Page<IngredientDto>>>> =>
    api.get('/ingredients', { params }),

  getById: (id: number): Promise<AxiosResponse<ApiResponse<IngredientDto>>> =>
    api.get(`/ingredients/${id}`),
}
