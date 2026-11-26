export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled'

export type EventCounts = { registered: number; waitlisted: number }

/**
 * Registered and waitlisted people per event (dev-1 D1-13), from registrations rows. Cancelled
 * rows count for neither, but an event that appears only with cancelled rows still gets zeros.
 */
export function summarizeCounts(rows: { event_id: number; status: RegistrationStatus }[]): Record<number, EventCounts> {
  const counts: Record<number, EventCounts> = {}
  for (const { event_id, status } of rows) {
    const entry = (counts[event_id] ??= { registered: 0, waitlisted: 0 })
    if (status === 'registered') entry.registered += 1
    else if (status === 'waitlisted') entry.waitlisted += 1
  }
  return counts
}
