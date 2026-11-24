import { notFound } from 'next/navigation'
import { locale as rootLocale } from 'next/root-params'
import { isLocale, type Locale } from './locale'

/*
  The locale of the page being rendered, on the server. The root layout already answers any other
  first segment with the 404; these narrow the type for the code that renders beside it (pages,
  generateMetadata, not-found).
*/

/** from a page's params: `const locale = await localeOf(params)` */
export async function localeOf(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return locale
}

/**
 * From the root [locale] segment (next/root-params), for server code that has no params or must
 * not wait for them: not-found.tsx, and the Suspense fallbacks of pages that read their other params
 * (an event id, a department slug) inside the boundary. The locale is known for every prerendered
 * shell, so reading it never blocks.
 */
export async function pageLocale(): Promise<Locale> {
  const value: unknown = await rootLocale()
  if (typeof value !== 'string' || !isLocale(value)) notFound()
  return value
}
