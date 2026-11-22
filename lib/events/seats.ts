import { standInRows, standInSeatsTaken } from './stand-in'

/*
  Seats taken per event, for the seat meters (redesign §5.4).

  STAND-IN: reads lib/events/stand-in.ts. Real: one grouped count of active registrations,
    db.from('registrations').select('event_id, count:event_id.count()').in('event_id', ids)
    .eq('status', 'registered')
  The homepage caches for an hour, so its meters can be up to an hour old; the event page (D1-11)
  should read this dynamically. Kept apart from queries.ts so that file's API stays as it is.
*/

/** seats taken for each id that has a known count (events without capacity are left out) */
export async function seatsTaken(ids: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  for (const id of ids) {
    const n = standInSeatsTaken(id)
    if (n !== null) out.set(id, n)
  }
  return out
}

/** what rpc('seats_left') resolves to: { data, error } */
export type SeatsLeftRpcResult = { data: number | null; error: { code?: string; message?: string } | null }

/**
 * Reads the result of rpc('seats_left') (dev-1 D1-10): error 42883 means the function does not
 * exist yet (until D2-9 merges), so the seat count is unknown (null); any other error throws.
 */
export function readSeatsLeft({ data, error }: SeatsLeftRpcResult): number | null {
  if (error) {
    if (error.code === '42883') return null
    throw new Error(`seats_left failed: ${error.code ?? ''} ${error.message ?? ''}`.trim())
  }
  return data ?? null
}

/**
 * Seats left for one event, or null when unknown (no capacity, or seats_left not there yet).
 * Live data: read it only on dynamic pages (the calendar, the event page).
 *
 * STAND-IN: capacity minus the stand-in seats taken (the same counts seatsTaken() returns).
 * Real:
 *   const db = await supabaseProdServer()
 *   return readSeatsLeft(await db.rpc('seats_left', { p_event_id: eventId }))
 */
export async function getSeatsLeft(eventId: number): Promise<number | null> {
  const row = standInRows().find((r) => r.id === eventId)
  const taken = standInSeatsTaken(eventId)
  if (!row || row.capacity === null || taken === null) return readSeatsLeft({ data: null, error: null })
  return readSeatsLeft({ data: Math.max(0, row.capacity - taken), error: null })
}
