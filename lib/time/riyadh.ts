import type { Locale } from '@/lib/i18n/locale'

/**
 * Times are stored in UTC and shown in Riyadh time (Asia/Riyadh, UTC+3 all year), in both languages.
 *
 * Arabic digits: Eastern Arabic (٠١٢٣), as the brand guide requires (redesign, 15 Nov 2026; this settles
 * open question Q1 of design/01-discovery.md). English: British day-month order with Latin digits and
 * 12-hour times, like the Arabic («6:00 pm»; dev-1 D1-7). `riyadhDateKey` stays Latin: it is a machine key.
 */
export const RIYADH_LOCALE = 'ar-SA-u-ca-gregory-nu-arab' // Gregorian calendar, Eastern Arabic digits
export const ENGLISH_DATE_LOCALE = 'en-GB-u-ca-gregory-nu-latn' // Gregorian calendar, Latin digits

/** the Intl locale for dates in each language */
export const DATE_LOCALE: Record<Locale, string> = { ar: RIYADH_LOCALE, en: ENGLISH_DATE_LOCALE }

const TIME_ZONE = 'Asia/Riyadh'

/** machine key, never shown: en-CA gives year, month and day as numbers */
const keyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const STYLES = {
  date: { day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
  datetime: { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' },
  // parts of the event card's date block and the hero's next-event brick
  day: { day: 'numeric' },
  month: { month: 'long' },
  weekday: { weekday: 'long' },
  monthYear: { month: 'long', year: 'numeric' },
} satisfies Record<string, Intl.DateTimeFormatOptions>

type Style = keyof typeof STYLES

const formats = new Map<string, Intl.DateTimeFormat>()
const formatFor = (style: Style, locale: Locale) => {
  const id = `${locale}:${style}`
  let format = formats.get(id)
  if (!format) {
    // en-GB defaults to a 24-hour clock; hour12 matches the Arabic, which is 12-hour already
    format = new Intl.DateTimeFormat(DATE_LOCALE[locale], { timeZone: TIME_ZONE, hour12: true, ...STYLES[style] })
    formats.set(id, format)
  }
  return format
}

/** 'YYYY-MM-DD' of the instant in Riyadh, e.g. for grouping events by day */
export function riyadhDateKey(utcIso: string): string {
  const parts = Object.fromEntries(keyFormat.formatToParts(new Date(utcIso)).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** 'YYYY-MM' of the instant in Riyadh, e.g. for the calendar's month pages */
export function riyadhMonth(utcIso: string): string {
  return riyadhDateKey(utcIso).slice(0, 7)
}

/**
 * For display, in Riyadh time: «١٨ نوفمبر ٢٠٢٦» / "18 November 2026", «٦:٠٠ م» / "6:00 pm", both, or one
 * part («١٨», «نوفمبر», «الأربعاء», «نوفمبر ٢٠٢٦» / "18", "November", "Wednesday", "November 2026").
 */
export function formatRiyadh(utcIso: string, style: Style, locale: Locale): string {
  return formatFor(style, locale).format(new Date(utcIso))
}

/** start–end clock times in Riyadh: «٦:٠٠–٨:٠٠ م» / "6:00 – 8:00 pm", naming both periods when they differ */
export function formatRiyadhTimeRange(startIso: string, endIso: string, locale: Locale): string {
  return formatFor('time', locale).formatRange(new Date(startIso), new Date(endIso))
}
