/**
 * Backend `/uploads/abc.jpg` kabi relative URL qaytaradi.
 * Bu helper uni to'liq URL ga aylantiradi: http://localhost:8090/uploads/abc.jpg
 *
 * VITE_API_BASE_URL=http://localhost:8090/api dan host qismi olinadi.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
  const host = apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${host}${path}`
}
