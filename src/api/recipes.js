import api from './axios'

export const recipesApi = {
  getAll:       (params) => api.get('/recipes', { params }),
  getById:      (id)     => api.get(`/recipes/${id}`),
  search:       (keyword, params) => api.get('/recipes/search', { params: { keyword, ...params } }),
  getByCategory:(id, params) => api.get(`/recipes/category/${id}`, { params }),
  getByDifficulty:(level, params) => api.get(`/recipes/difficulty/${level}`, { params }),
  getMy:        (params) => api.get('/recipes/my', { params }),
  create:       (data)   => api.post('/recipes', data),
  update:       (id, data) => api.put(`/recipes/${id}`, data),
  delete:       (id)     => api.delete(`/recipes/${id}`),
}
