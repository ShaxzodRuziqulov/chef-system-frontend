import api from './axios'
import type { AxiosResponse }    from 'axios'
import type {
  ApiResponse,
  Page,
  ShoppingListDto,
  ShoppingListItemStatusRequest,
} from '@/types'

interface ListParams { page?: number; size?: number }

type ListPageResponse = AxiosResponse<ApiResponse<Page<ShoppingListDto>>>
type ListResponse     = AxiosResponse<ApiResponse<ShoppingListDto>>

export const shoppingApi = {
  getMy: (params?: ListParams): Promise<ListPageResponse> =>
    api.get('/shopping-lists', { params }),

  getById: (id: number): Promise<ListResponse> =>
    api.get(`/shopping-lists/${id}`),

  /** Meal plan ID asosida avtomatik yaratish */
  generate: (mealPlanId: number): Promise<ListResponse> =>
    api.post(`/shopping-lists/generate/${mealPlanId}`),

  /** Mahsulot holatini yangilash (PENDING ↔ PURCHASED) */
  updateItem: (
    listId: number,
    itemId: number,
    data:   ShoppingListItemStatusRequest,
  ): Promise<ListResponse> =>
    api.put(`/shopping-lists/${listId}/items/${itemId}`, data),

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/shopping-lists/${id}`),
}
