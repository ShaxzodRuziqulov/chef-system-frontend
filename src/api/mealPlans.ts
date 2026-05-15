import api from './axios'
import type { AxiosResponse }    from 'axios'
import type {
  ApiResponse,
  Page,
  MealPlanResponse,
  MealPlanCreateRequest,
  MealPlanEntryRequest,
} from '@/types'

interface PlanParams { page?: number; size?: number }

type PlanPageResponse = AxiosResponse<ApiResponse<Page<MealPlanResponse>>>
type PlanResponse     = AxiosResponse<ApiResponse<MealPlanResponse>>

export const mealPlansApi = {
  getMy: (params?: PlanParams): Promise<PlanPageResponse> =>
    api.get('/meal-plans', { params }),

  getById: (id: number): Promise<PlanResponse> =>
    api.get(`/meal-plans/${id}`),

  create: (data: MealPlanCreateRequest): Promise<PlanResponse> =>
    api.post('/meal-plans', data),

  update: (id: number, data: { name: string; notes?: string }): Promise<PlanResponse> =>
    api.put(`/meal-plans/${id}`, data),

  addEntry: (planId: number, data: MealPlanEntryRequest): Promise<PlanResponse> =>
    api.post(`/meal-plans/${planId}/entries`, data),

  removeEntry: (planId: number, entryId: number): Promise<PlanResponse> =>
    api.delete(`/meal-plans/${planId}/entries/${entryId}`),

  activate: (id: number): Promise<PlanResponse> =>
    api.put(`/meal-plans/${id}/activate`),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/meal-plans/${id}`),
}
