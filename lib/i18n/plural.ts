import { t, type StringKey } from './t'
import { fmtNum } from './number'
import type { Locale } from './locale'

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
const rules: Record<Locale, Intl.PluralRules> = { ar: new Intl.PluralRules('ar'), en: new Intl.PluralRules('en') }

/**
 * The plural category of n. Arabic: 0 zero · 1 one · 2 two · 3–10 few · 11–99 many · 100+ other.
 * English: 0 zero (its own wording, such as "No recordings yet") · 1 one · anything else other.
 * Both string files hold all six forms (identical key sets); English never reads two, few or many.
 */
export function pluralCategory(locale: Locale, n: number): PluralCategory {
  if (n === 0) return 'zero'
  return rules[locale].select(n) as PluralCategory
}

/**
 * The plural form of `base` for n, with {n} filled in the page's digits.
 * The files hold `${base}.zero|one|two|few|many|other`: tp('ar', 'seats.left', 3) → «تبقّت ٣ مقاعد»,
 * tp('en', 'seats.left', 3) → "3 seats left".
 */
export function tp(locale: Locale, base: string, n: number): string {
  const key = `${base}.${pluralCategory(locale, n)}` as StringKey
  return t(locale, key, { n: fmtNum(n, locale) })
}

/** all six forms of `base`, for client components that pick a form themselves (see pickPlural) */
export function pluralForms(locale: Locale, base: string): Record<PluralCategory, string> {
  const cats: PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other']
  return Object.fromEntries(cats.map((c) => [c, t(locale, `${base}.${c}` as StringKey, { n: '{n}' })])) as Record<PluralCategory, string>
}

/** client side: fill one of the forms from pluralForms() */
export function pickPlural(locale: Locale, forms: Record<PluralCategory, string>, n: number): string {
  return forms[pluralCategory(locale, n)].replace('{n}', fmtNum(n, locale))
}
