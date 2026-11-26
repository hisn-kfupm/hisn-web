/*
  CLAUDE.md: `returnTo` accepts only same-site relative paths. Used by /sign-in now and by the auth
  task (D2-4) after a successful sign-in.
*/
import { isLocale, type Locale } from '@/lib/i18n/locale'

const ORIGIN = 'https://hisn.invalid'
const MAX_LENGTH = 512

/**
 * A same-site path to go back to, or '/' for anything else (other hosts, protocol-relative, scripts,
 * longer than 512 characters). Locale-prefixed paths (/ar/…, /en/…) and /admin pass. When the query
 * parameter repeats, Next gives a string[]; the first value counts.
 */
export function safeReturnTo(input: string | string[] | null | undefined): string {
  const raw = Array.isArray(input) ? input[0] : input
  if (!raw || raw.length > MAX_LENGTH || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return '/'
  }
  if (decoded.startsWith('//') || decoded.includes('\\')) return '/'
  try {
    if (new URL(raw, ORIGIN).origin !== ORIGIN) return '/'
  } catch {
    return '/'
  }
  return raw
}

/**
 * Where sign-in returns to (D2-5): a same-site path, kept in the sign-in page's language. Nothing
 * usable → that language's homepage; a path without a locale (an old link) gets the page's;
 * /admin and /api have none.
 */
export function signInReturnTo(input: string | string[] | null | undefined, locale: Locale): string {
  const target = safeReturnTo(input)
  if (target === '/') return `/${locale}`
  const first = target.split(/[/?#]/)[1]
  return isLocale(first) || first === 'admin' || first === 'api' ? target : `/${locale}${target}`
}

/** a university address (….edu, ….edu.sa), which stops working after graduation; sign-in warns about it */
export function isInstitutionalEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).toLowerCase()
  return domain === 'edu' || domain.endsWith('.edu') || domain.endsWith('.edu.sa')
}
