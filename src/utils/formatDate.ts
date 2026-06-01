const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
const MONTHS_LONG  = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

/**
 * Sanani o'zbekcha formatda qaytaradi.
 * 'short'      → "1 Iyun 2026"
 * 'long'       → "1 Iyun 2026"  (short bilan bir xil, kengaytirilgan oy)
 * 'month-year' → "Iyun 2026"
 */
export function formatDate(
  dt: string | Date | null | undefined,
  format: 'short' | 'long' | 'month-year' = 'short'
): string {
  if (!dt) return ''
  const d = new Date(dt)
  if (isNaN(d.getTime())) return ''

  const day   = d.getDate()
  const month = d.getMonth()
  const year  = d.getFullYear()

  if (format === 'month-year') return `${MONTHS_LONG[month]} ${year}`
  if (format === 'long')       return `${day} ${MONTHS_LONG[month]} ${year}`
  return `${day} ${MONTHS_SHORT[month]} ${year}`
}
