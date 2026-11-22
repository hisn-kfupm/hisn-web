import { isAlmostFull } from './almost-full'
import type { PublicEvent } from './types'

export type CalendarStatus = 'cancelled' | 'ended' | 'full' | 'almostFull' | 'open'

/**
 * The one status the calendar shows on an event (dev-1 D1-10), first match wins:
 * cancelled («أُلغيت») → ended («انتهت») → full → almost full («المقاعد شارفت على الاكتمال!») → open.
 * Seats left is null while seats_left does not exist (D2-9), so no seat badge shows then.
 */
export function calendarStatus(e: PublicEvent, seatsLeft: number | null, now: number): CalendarStatus {
  if (e.status === 'cancelled') return 'cancelled'
  if (now >= Date.parse(e.endsAt)) return 'ended'
  if (seatsLeft === 0) return 'full'
  if (isAlmostFull(e.capacity, seatsLeft)) return 'almostFull'
  return 'open'
}
