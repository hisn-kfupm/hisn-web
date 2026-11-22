import { t, type StringKey } from './t'
import { fmtNum } from './number'

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
const rules = new Intl.PluralRules('ar')

/** Arabic plural category for n: 0 zero · 1 one · 2 two · 3–10 few · 11–99 many · 100+ other */
export function pluralCategory(n: number): PluralCategory {
  return rules.select(n) as PluralCategory
}

/**
 * The plural form of `base` for n, with {n} filled in Eastern Arabic digits.
 * ar.json holds `${base}.zero|one|two|few|many|other`, e.g. tp('seats.left', 3) → «تبقّت ٣ مقاعد».
 */
export function tp(base: string, n: number): string {
  const key = `${base}.${pluralCategory(n)}` as StringKey
  const text = t(key, { n: fmtNum(n) })
  return text
}

/** all six forms of `base`, for client components that pick a form themselves (see pickPlural) */
export function pluralForms(base: string): Record<PluralCategory, string> {
  const cats: PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other']
  return Object.fromEntries(cats.map((c) => [c, t(`${base}.${c}` as StringKey, { n: '{n}' })])) as Record<PluralCategory, string>
}

/** client side: fill one of the forms from pluralForms() */
export function pickPlural(forms: Record<PluralCategory, string>, n: number, digits: (n: number) => string = fmtNum): string {
  return forms[pluralCategory(n)].replace('{n}', digits(n))
}
