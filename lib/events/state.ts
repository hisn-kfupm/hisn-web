import { isAlmostFull } from './almost-full'
import type { ButtonState, PublicEvent } from './types'

/**
 * What the register button shows. The checks run in this order and the first match wins:
 * cancelled → ended → registered → waitlisted → closed → full → open_almost_full → open.
 * So your own registration still shows after registration closes, and a waitlist place beats "full".
 */
export function eventButtonState(
  e: PublicEvent,
  seatsLeft: number | null,
  mine: 'registered' | 'waitlisted' | null,
  now: Date,
): ButtonState {
  const at = now.getTime()
  if (e.status === 'cancelled') return 'cancelled'
  if (at >= Date.parse(e.endsAt)) return 'ended'
  if (mine === 'registered') return 'registered'
  if (mine === 'waitlisted') return 'waitlisted'
  if (at >= Date.parse(e.registrationClosesAt)) return 'closed'
  if (seatsLeft === 0) return 'full'
  if (isAlmostFull(e.capacity, seatsLeft)) return 'open_almost_full'
  return 'open'
}
