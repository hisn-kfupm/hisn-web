import { parseMonthParam } from './month'
import { eventsInMonth, upcomingEvents } from './queries'
import { getSeatsLeft } from './seats'
import type { PublicEvent } from './types'

export type CalendarData = {
  month: string
  events: PublicEvent[]
  /** seats left by event id; null while unknown (no capacity, or seats_left not there yet) */
  seatsLeft: Map<number, number | null>
  /**
   * the next upcoming event, featured at the top of the calendar whatever the month on screen
   * (revision 04 §5; dev-1 D1-10 showed it only when no event of the month was still ahead)
   */
  next: PublicEvent | null
}

/** everything /events renders for ?m= (dev-1 D1-10); live seats, so call it at request time */
export async function loadCalendar(m: string | undefined, now: Date): Promise<CalendarData> {
  const month = parseMonthParam(m, now)
  const events = await eventsInMonth(month)
  const [lefts, [next = null]] = await Promise.all([Promise.all(events.map((e) => getSeatsLeft(e.id))), upcomingEvents({ limit: 1 })])
  return { month, events, seatsLeft: new Map(events.map((e, i) => [e.id, lefts[i]])), next }
}
