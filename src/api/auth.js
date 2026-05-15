import api from './axios'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
  logout:   (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }),
}
