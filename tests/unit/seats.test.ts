import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getSeatsLeft, readSeatsLeft, seatsTaken } from '@/lib/events/seats'
import { standInRows } from '@/lib/events/stand-in'

/*
  dev-1 D1-10, seats.test.ts. The spec mocks the Supabase client's rpc('seats_left'); until A-2
  lands there is no client, so the handling of the rpc result lives in readSeatsLeft (pure) and is
  tested with exactly the spec's three results. getSeatsLeft reads the stand-in rows meanwhile.
*/
describe('readSeatsLeft (rpc seats_left result)', () => {
  it('gives null while the function does not exist yet (42883)', () => {
    expect(readSeatsLeft({ data: null, error: { code: '42883' } })).toBeNull()
  })

  it('gives the number of seats left', () => {
    expect(readSeatsLeft({ data: 4, error: null })).toBe(4)
  })

  it('throws on any other error', () => {
    expect(() => readSeatsLeft({ data: null, error: { code: '500' } })).toThrow()
  })
})

describe('getSeatsLeft (stand-in)', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T09:00:00Z'))
  })
  afterAll(() => vi.useRealTimers())

  it('is capacity minus seatsTaken for every event with both, and null otherwise', async () => {
    const rows = standInRows()
    const taken = await seatsTaken(rows.map((r) => r.id))
    for (const r of rows) {
      const expected = r.capacity !== null && taken.has(r.id) ? Math.max(0, r.capacity - (taken.get(r.id) as number)) : null
      expect(await getSeatsLeft(r.id)).toBe(expected)
    }
  })

  it('has at least one full and one almost-full event to show', async () => {
    const lefts = await Promise.all(standInRows().map((r) => getSeatsLeft(r.id)))
    expect(lefts).toContain(0)
    expect(lefts.some((n) => n !== null && n > 0 && n <= 6)).toBe(true)
  })
})
