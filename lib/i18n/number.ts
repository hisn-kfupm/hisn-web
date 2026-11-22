import { RIYADH_LOCALE } from '@/lib/time/riyadh'

const formats = new Map<string, Intl.NumberFormat>()

/**
 * A number for display, in the same Eastern Arabic digits as dates and times (discovery G-8
 * `fmtNum`): fmtNum(7) → «٧», fmtNum(1, { minimumIntegerDigits: 2 }) → «٠١».
 */
export function fmtNum(n: number, options: Intl.NumberFormatOptions = {}): string {
  const key = JSON.stringify(options)
  let format = formats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(RIYADH_LOCALE, options)
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
