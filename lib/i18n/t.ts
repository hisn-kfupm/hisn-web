import ar from './ar.json'
import en from './en.json'
import type { Locale } from './locale'

export type StringKey = keyof typeof ar

/*
  The two string files (dev-1 D1-2): flat objects with dotted keys and identical key sets. Typing
  en.json against ar.json's keys makes a key missing from en.json a type error as well as a failing
  test (tests/unit/i18n.test.ts checks both directions).
*/
const english: Record<StringKey, string> = en
const strings: Record<Locale, Record<string, string>> = { ar, en: english }

/** the draft marker that ends unapproved copy, with the space before it */
const DRAFT_MARKER = /\s?«مؤقت»/g

/**
 * A UI string in the page's language: t(locale, 'seats.left', { n: 3 }). The locale always comes
 * first (admin, which is Arabic only, calls t('ar', …)). `{name}` placeholders must all be
 * supplied, or this throws. With NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1 (demos), the «مؤقت» markers are
 * left out of the returned text; they stay in the files, so `npm run check:content` still lists them.
 */
export function t(locale: Locale, key: StringKey, vars?: Record<string, string | number>): string {
  const raw = strings[locale][key]
  // a key added to a string file while `next dev` runs is not picked up by the server until a restart
  if (raw === undefined) throw new Error(`unknown string key "${key}" (just added it to ${locale}.json? restart next dev)`)
  const text = raw.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!vars || !(name in vars)) throw new Error(`missing var ${name} for key ${key}`)
    return String(vars[name])
  })
  return stripDraft(text)
}

/**
 * Leaves the «مؤقت» draft markers out of a text when NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1 (demos);
 * otherwise returns it unchanged. t() uses it, and so do the stand-in event rows, so a demo shows
 * no marker anywhere while the raw text keeps them for `npm run check:content`.
 */
export function stripDraft(text: string): string {
  return process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS === '1' ? text.replace(DRAFT_MARKER, '') : text
}
