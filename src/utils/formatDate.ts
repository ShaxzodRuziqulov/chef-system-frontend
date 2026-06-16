const UZ_MONTHS_LONG  = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const UZ_MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

/**
 * Sanani tanlangan tilda formatda qaytaradi.
 * 'short'      → "1 Iyn 2026"
 * 'long'       → "1 Iyun 2026"
 * 'month-year' → "Iyun 2026"
 */
export function formatDate(
  dt: string | Date | null | undefined,
  format: 'short' | 'long' | 'month-year' = 'short',
  lang = 'uz',
): string {
  if (!dt) return ''
  const d = new Date(dt)
  if (isNaN(d.getTime())) return ''

  // Uzbek locale — Intl uz-UZ inconsistent, use manual month names
  if (lang === 'uz') {
    const m = d.getMonth()
    const day  = d.getDate()
    const year = d.getFullYear()
    if (format === 'month-year') return `${UZ_MONTHS_LONG[m]} ${year}`
    if (format === 'long')       return `${day} ${UZ_MONTHS_LONG[m]} ${year}`
    return `${day} ${UZ_MONTHS_SHORT[m]} ${year}`
  }

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  if (format === 'month-year') {
    const s = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  if (format === 'long') {
    const s = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const s = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
