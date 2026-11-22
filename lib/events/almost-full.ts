/** share of seats left at which an event counts as almost full */
export const ALMOST_FULL_RATIO = 0.2

/**
 * True when some seats are left but no more than 20% of capacity (always at least the last seat).
 * False without a capacity limit, without a seat count, or when the event is full.
 */
export function isAlmostFull(capacity: number | null, seatsLeft: number | null): boolean {
  if (capacity === null || seatsLeft === null) return false
  return seatsLeft > 0 && seatsLeft <= Math.max(1, Math.floor(capacity * ALMOST_FULL_RATIO))
}
