/*
  The site's two languages (dev-1 D1-1, spec revision 2.3): Arabic, right to left, at /ar, and
  English, left to right, at /en. Arabic is the default; the admin area is Arabic only.
*/
export type Locale = 'ar' | 'en'

export const LOCALES = ['ar', 'en'] as const

export const DEFAULT_LOCALE: Locale = 'ar'

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x)
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}
