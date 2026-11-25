import { isLocale, type Locale } from './locale'

/*
  Addresses carry their language (dev-1 D1-5, spec §6.6): every internal link goes through
  localePath(locale, path), so a visitor on /en stays on /en, and the language switcher opens the
  same page in the other language with switchLocalePath. Safe in client components: it imports
  only the locale list.
*/

/** the leading /ar or /en segment, or null when the path has none (/admin, /) */
export function localeOfPath(path: string): Locale | null {
  const first = /^\/([^/?#]*)/.exec(path)?.[1] ?? ''
  return isLocale(first) ? first : null
}

/** the path without its language segment: /ar/events/7 → /events/7, /en → /, /en?x=1 → /?x=1 */
export function withoutLocale(path: string): string {
  const locale = localeOfPath(path)
  if (!locale) return path
  const rest = path.slice(locale.length + 1)
  return rest.startsWith('/') ? rest : `/${rest}`
}

/**
 * A site path in one language: localePath('en', '/events') → '/en/events'. The homepage is the
 * bare language ('/ar', not '/ar/', which Next would redirect); the query and hash are kept.
 */
export function localePath(locale: Locale, path: string): string {
  const rooted = path.startsWith('/') ? path : `/${path}`
  // '/', '/?q' and '/#x' attach to the bare language
  return `/${locale}${/^\/(?=[?#]|$)/.test(rooted) ? rooted.slice(1) : rooted}`
}

/**
 * The same page in another language, query and hash kept:
 * switchLocalePath('/ar/events?m=2026-12', 'en') → '/en/events?m=2026-12'. A path without a
 * language segment gets one.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localePath(target, withoutLocale(pathname))
}
