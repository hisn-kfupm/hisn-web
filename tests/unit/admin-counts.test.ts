import { describe, expect, it } from 'vitest'
import { summarizeCounts } from '@/lib/admin/counts'

/* dev-1 D1-13: the events list's registered and waitlist counts */
describe('summarizeCounts', () => {
  it('counts registered and waitlisted rows per event and ignores cancelled ones', () => {
    expect(
      summarizeCounts([
        { event_id: 1, status: 'registered' },
        { event_id: 1, status: 'waitlisted' },
        { event_id: 1, status: 'cancelled' },
        { event_id: 2, status: 'registered' },
      ]),
    ).toEqual({ 1: { registered: 1, waitlisted: 1 }, 2: { registered: 1, waitlisted: 0 } })
  })

  it('returns nothing for no rows', () => {
    expect(summarizeCounts([])).toEqual({})
  })

  it('gives an event whose rows are all cancelled zero of each', () => {
    expect(summarizeCounts([{ event_id: 3, status: 'cancelled' }])).toEqual({ 3: { registered: 0, waitlisted: 0 } })
  })

  it('adds up many rows', () => {
    const rows = [
      ...Array.from({ length: 1200 }, () => ({ event_id: 7, status: 'registered' as const })),
      ...Array.from({ length: 45 }, () => ({ event_id: 7, status: 'waitlisted' as const })),
    ]
    expect(summarizeCounts(rows)).toEqual({ 7: { registered: 1200, waitlisted: 45 } })
  })
})
