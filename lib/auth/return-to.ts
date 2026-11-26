/*
  CLAUDE.md: `returnTo` accepts only same-site relative paths. Used by /sign-in now and by the auth
  task (D2-4) after a successful sign-in.
*/

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

/** a university address (….edu, ….edu.sa), which stops working after graduation; sign-in warns about it */
export function isInstitutionalEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).toLowerCase()
  return domain === 'edu' || domain.endsWith('.edu') || domain.endsWith('.edu.sa')
}
