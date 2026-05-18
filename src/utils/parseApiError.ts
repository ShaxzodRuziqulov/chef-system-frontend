/**
 * Backenddan kelgan xato obyektini foydalanuvchiga tushunarli matnga o'giradi.
 * Raw SQL / stack trace matni ko'rsatilmaydi.
 */
export function parseApiError(e: any, fallback = "Xatolik yuz berdi"): string {
  if (!e?.response) {
    return "Internet aloqasi yo'q yoki server javob bermayapti"
  }

  const status = e.response.status
  const msg: string = e?.response?.data?.message ?? ''

  // 400 va 409 — backend o'zi tushunarli xabar yuboradi
  if (status === 400 || status === 409) {
    return msg || fallback
  }

  if (status === 401) return "Tizimga kirish talab etiladi"
  if (status === 403) return "Bu amalni bajarish uchun ruxsat yo'q"
  if (status === 404) return "Ma'lumot topilmadi"

  // 500 va boshqa server xatolari — xom xabarni ko'rsatma
  if (status >= 500) return "Serverda xato yuz berdi, qayta urinib ko'ring"

  return msg || fallback
}
