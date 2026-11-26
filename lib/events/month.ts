import type { Locale } from '@/lib/i18n/locale'
import { DATE_LOCALE, riyadhDateKey, riyadhMonth } from '@/lib/time/riyadh'

/*
  Month arithmetic for the calendar (dev-1 D1-10). A month is 'YYYY-MM' in Riyadh time, which is
  UTC+3 all year (no DST), so a Riyadh day starts at 21:00 UTC the day before. Days are
  'YYYY-MM-DD' keys, the same shape as riyadhDateKey().
*/

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/
const DAY_MS = 86_400_000

const split = (month: string): [number, number] => [Number(month.slice(0, 4)), Number(month.slice(5, 7))]
const join = (y: number, m: number) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`
const key = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** a valid 'YYYY-MM' (01–12) is kept; anything else gives the current Riyadh month */
export function parseMonthParam(m: string | undefined, now: Date): string {
  return m !== undefined && MONTH.test(m) ? m : riyadhMonth(now.toISOString())
}

export function nextMonth(month: string): string {
  const [y, m] = split(month)
  return m === 12 ? join(y + 1, 1) : join(y, m + 1)
}

export function prevMonth(month: string): string {
  const [y, m] = split(month)
  return m === 1 ? join(y - 1, 12) : join(y, m - 1)
}

/** the month as [from, to) ISO UTC instants: midnight Riyadh on the 1st to midnight on the next 1st */
export function monthRangeUtc(month: string): { from: string; to: string } {
  const start = (mo: string) => new Date(`${mo}-01T00:00:00+03:00`).toISOString()
  return { from: start(month), to: start(nextMonth(month)) }
}

/** the month's days padded to whole weeks that start on Sunday, as 'YYYY-MM-DD' cells */
export function buildMonthGrid(month: string): string[] {
  const [y, m] = split(month)
  const first = Date.UTC(y, m - 1, 1)
  const last = Date.UTC(y, m, 0)
  const start = first - new Date(first).getUTCDay() * DAY_MS
  const end = last + (6 - new Date(last).getUTCDay()) * DAY_MS
  const cells: string[] = []
  for (let at = start; at <= end; at += DAY_MS) cells.push(key(at))
  return cells
}

/** a Riyadh day key for "now", for marking today and past days in the grid */
export function dayKeyOf(ms: number): string {
  return key(ms + 3 * 3_600_000)
}

/** the seven weekday names from Intl in the page's language, Sunday first (columns run Sunday at the inline-start) */
export function weekdayNames(locale: Locale, style: 'long' | 'short' = 'long'): string[] {
  const format = new Intl.DateTimeFormat(DATE_LOCALE[locale], { weekday: style, timeZone: 'UTC' })
  // 1 Nov 2026 is a Sunday
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2026, 10, 1 + i, 12))))
}

/** an instant in the middle of the month, for formatting its name and year in Riyadh time */
export function monthMidpoint(month: string): string {
  return `${month}-15T12:00:00.000Z`
}

/** events by their Riyadh day ('YYYY-MM-DD'), in the order given (eventsInMonth sorts by start) */
export function groupByDay<T extends { startsAt: string }>(events: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>()
  for (const e of events) {
    const k = riyadhDateKey(e.startsAt)
    const list = days.get(k)
    if (list) list.push(e)
    else days.set(k, [e])
  }
  return days
}
