/**
 * Times are stored in UTC and shown in Riyadh time (Asia/Riyadh, UTC+3 all year).
 *
 * Digits: Eastern Arabic (٠١٢٣), as the brand guide requires (redesign, 15 Nov 2026; this settles
 * open question Q1 of design/01-discovery.md). `riyadhDateKey` stays Latin: it is a machine key.
 */
export const RIYADH_LOCALE = 'ar-SA-u-ca-gregory-nu-arab' // Gregorian calendar, Eastern Arabic digits

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

const formats = new Map<Style, Intl.DateTimeFormat>()
const formatFor = (style: Style) => {
  let format = formats.get(style)
  if (!format) {
    format = new Intl.DateTimeFormat(RIYADH_LOCALE, { timeZone: TIME_ZONE, ...STYLES[style] })
    formats.set(style, format)
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

/** for display: «١٨ نوفمبر ٢٠٢٦», «٦:٠٠ م», both, or one part («١٨», «نوفمبر», «الأربعاء», «نوفمبر ٢٠٢٦») */
export function formatRiyadh(utcIso: string, style: Style): string {
  return formatFor(style).format(new Date(utcIso))
}

/** start–end clock times in Riyadh: «٦:٠٠–٨:٠٠ م», or «٩:٠٠ ص – ٨:٠٠ م» when the periods differ */
export function formatRiyadhTimeRange(startIso: string, endIso: string): string {
  return formatFor('time').formatRange(new Date(startIso), new Date(endIso))
}
