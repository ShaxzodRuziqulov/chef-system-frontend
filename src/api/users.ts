import api from './axios'

export const usersApi = {
  /** Admin: barcha foydalanuvchilar (sahifalangan, qidiruv bilan) */
  getAll: (params?: { page?: number; size?: number; search?: string }) =>
    api.get('/users', { params }),

  /** Faol foydalanuvchilar soni */
  countActive: () =>
    api.get('/users/count-active'),

  /** Admin: foydalanuvchi ma'lumotlarini yangilash (newPassword ixtiyoriy) */
  update: (id: string, payload: { fullName?: string; username?: string; email?: string; role?: string; active?: boolean; newPassword?: string }) =>
    api.put(`/users/${id}`, payload),

  /** Foydalanuvchini bloklash */
  deactivate: (id: string) =>
    api.put(`/users/${id}/deactivate`),

  /** Foydalanuvchini faollashtirish */
  activate: (id: string) =>
    api.put(`/users/${id}/activate`),

  /** Shartlarga rozilik berib BLOGGER bo'lish */
  becomeBlogger: () =>
    api.post('/users/become-blogger', { termsAccepted: true }),

  /** Oshpaz statusidan chiqib USER ga qaytish */
  leaveOshpaz: (id: string | number) =>
    api.put(`/users/${id}`, { role: 'USER' }),
}
