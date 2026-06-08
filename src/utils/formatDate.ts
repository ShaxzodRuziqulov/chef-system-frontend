const LOCALE_MAP: Record<string, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
}

/**
 * Sanani tanlangan tilda formatda qaytaradi.
 * 'short'      → "1 Jun 2026"
 * 'long'       → "1 June 2026"
 * 'month-year' → "June 2026"
 */
export function formatDate(
  dt: string | Date | null | undefined,
  format: 'short' | 'long' | 'month-year' = 'short',
  lang = 'uz',
): string {
  if (!dt) return ''
  const d = new Date(dt)
  if (isNaN(d.getTime())) return ''

  const locale = LOCALE_MAP[lang] ?? 'uz-UZ'

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
