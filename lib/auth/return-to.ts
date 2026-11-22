/*
  CLAUDE.md: `returnTo` accepts only same-site relative paths. Used by /sign-in now and by the auth
  task (D2-4) after a successful sign-in.
*/

const ORIGIN = 'https://hisn.invalid'

/** a same-site path to go back to, or '/' for anything else (other hosts, protocol-relative, scripts) */
export function safeReturnTo(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
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
