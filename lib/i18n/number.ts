import { RIYADH_LOCALE } from '@/lib/time/riyadh'
import type { Locale } from './locale'

const formats = new Map<string, Intl.NumberFormat>()

/** Arabic pages use the Eastern Arabic digits of their dates and times; English pages use Latin digits */
const NUMBER_LOCALE: Record<Locale, string> = { ar: RIYADH_LOCALE, en: 'en-GB-u-nu-latn' }

/**
 * A number for display in the page's language (discovery G-8 `fmtNum`): fmtNum(7, 'ar') → «٧»,
 * fmtNum(7, 'en') → "7", fmtNum(1, 'ar', { minimumIntegerDigits: 2 }) → «٠١».
 */
export function fmtNum(n: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  const key = `${locale} ${JSON.stringify(options)}`
  let format = formats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(NUMBER_LOCALE[locale], options)
    formats.set(key, format)
  }
  return format.format(n)
}

const ARABIC_LETTER = /[؀-ۿ]/
const EASTERN = '٠١٢٣٤٥٦٧٨٩'

/** true when a free text (a place, a name) is written in Arabic */
export function isArabicText(text: string): boolean {
  return ARABIC_LETTER.test(text)
}

/**
 * Latin digits inside an Arabic free text (a place such as «مبنى 58 · قاعة 102») become Eastern
 * Arabic, like every other figure on the site. Latin text (a code, an English name) is left alone.
 */
export function arabicDigits(text: string): string {
  return isArabicText(text) ? text.replace(/[0-9]/g, (d) => EASTERN[Number(d)]) : text
}
