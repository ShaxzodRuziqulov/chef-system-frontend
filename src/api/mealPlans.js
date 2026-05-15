import api from './axios'

export const mealPlansApi = {
  getMy:       (params)       => api.get('/meal-plans', { params }),
  getById:     (id)           => api.get(`/meal-plans/${id}`),
  create:      (data)         => api.post('/meal-plans', data),
  addEntry:    (id, data)     => api.post(`/meal-plans/${id}/entries`, data),
  removeEntry: (id, entryId)  => api.delete(`/meal-plans/${id}/entries/${entryId}`),
  activate:    (id)           => api.put(`/meal-plans/${id}/activate`),
  delete:      (id)           => api.delete(`/meal-plans/${id}`),
}
