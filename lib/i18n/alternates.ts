import { DEFAULT_LOCALE, type Locale } from './locale'
import { localePath } from './paths'

export type Alternates = { canonical: string; languages: { ar: string; en: string; 'x-default': string } }

/**
 * A page's language versions for its metadata (dev-1 D1-5, spec §6.6): hreflang `ar`, `en`, and
 * `x-default` pointing to the Arabic page. Every public page's generateMetadata returns
 * `alternates: alternatesFor('<path without the language>', locale)`.
 *
 * Pass the page's locale: each language version must be its own canonical, or search engines
 * fold the English page into the Arabic one (Google: hreflang, "use canonical within the same
 * language"). Without it the canonical is the x-default page. The root layout's metadataBase
 * turns these paths into the absolute URLs hreflang needs.
 */
export function alternatesFor(path: string, locale: Locale = DEFAULT_LOCALE): Alternates {
  const ar = localePath('ar', path)
  return {
    canonical: localePath(locale, path),
    languages: { ar, en: localePath('en', path), 'x-default': ar },
  }
}
