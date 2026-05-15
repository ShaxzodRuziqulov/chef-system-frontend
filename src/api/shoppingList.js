import api from './axios'

export const shoppingApi = {
  getMy:        (params)          => api.get('/shopping-lists', { params }),
  getById:      (id)              => api.get(`/shopping-lists/${id}`),
  generate:     (mealPlanId)      => api.post(`/shopping-lists/generate/${mealPlanId}`),
  updateItem:   (listId, itemId, data) => api.patch(`/shopping-lists/${listId}/items/${itemId}`, data),
  delete:       (id)              => api.delete(`/shopping-lists/${id}`),
}
