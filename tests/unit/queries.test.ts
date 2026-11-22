import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { eventsInMonth, getPublicEvent, latestRecordings, PUBLIC_EVENT_COLUMNS, toPublicEvent, upcomingEvents } from '@/lib/events/queries'
import { monthRangeUtc } from '@/lib/events/month'
import { STAND_IN_IDS } from '@/lib/events/stand-in'
import { departments } from '@/lib/data/labels'

/*
  dev-1 D1-8 lists these checks for tests/db/queries.test.ts against the seed. Until A-2 (the
  client) and A-3/A-6 (tables and seed) are on main, they run here against the stand-in rows.
  STAND_IN_IDS mirrors the names of SEED.events.* so the db test can reuse the same assertions.
*/
const NOW = new Date('2026-11-15T09:00:00Z')

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})

describe('upcomingEvents', () => {
  it('returns at most `limit` published events that have not started', async () => {
    const events = await upcomingEvents({ limit: 3 })
    expect(events.length).toBeGreaterThan(0)
    expect(events.length).toBeLessThanOrEqual(3)
    for (const e of events) {
      expect(e.status).toBe('published')
      expect(new Date(e.startsAt) > NOW).toBe(true)
    }
  })

  it('orders by start time, soonest first', async () => {
    const starts = (await upcomingEvents({ limit: 100 })).map((e) => Date.parse(e.startsAt))
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('never includes drafts or cancelled events', async () => {
    const ids = (await upcomingEvents({ limit: 100 })).map((e) => e.id)
    expect(ids).not.toContain(STAND_IN_IDS.draft)
    expect(ids).not.toContain(STAND_IN_IDS.cancelled)
  })

  it('filters by department', async () => {
    const code = departments[0].code
    const events = await upcomingEvents({ limit: 100, departmentCode: code })
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) expect(e.departmentCode).toBe(code)
  })

  it('never exposes the meeting link', async () => {
    const [first] = await upcomingEvents({ limit: 1 })
    expect(Object.keys(first)).not.toContain('meetingUrl')
    expect(Object.keys(first)).not.toContain('meeting_url')
  })
})

describe('latestRecordings', () => {
  it('returns ended events with a recording, newest first', async () => {
    const events = await latestRecordings({ limit: 100 })
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      expect(e.recordingUrl).not.toBeNull()
      expect(new Date(e.endsAt) < NOW).toBe(true)
    }
    const ends = events.map((e) => Date.parse(e.endsAt))
    expect(ends).toEqual([...ends].sort((a, b) => b - a))
  })

  it('includes a past event with a recording and leaves out one without', async () => {
    const ids = (await latestRecordings({ limit: 100 })).map((e) => e.id)
    expect(ids).toContain(STAND_IN_IDS.pastWithRecording)
    expect(ids).not.toContain(STAND_IN_IDS.pastNoRecording)
  })

  it('respects the limit and the department filter', async () => {
    expect(await latestRecordings({ limit: 2 })).toHaveLength(2)
    const code = departments[0].code
    const events = await latestRecordings({ limit: 100, departmentCode: code })
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) expect(e.departmentCode).toBe(code)
  })
})

describe('getPublicEvent', () => {
  it('hides drafts', async () => {
    expect(await getPublicEvent(STAND_IN_IDS.draft)).toBeNull()
  })

  it('shows cancelled events, marked cancelled', async () => {
    expect((await getPublicEvent(STAND_IN_IDS.cancelled))?.status).toBe('cancelled')
  })

  it('returns null for an unknown id', async () => {
    expect(await getPublicEvent(999_999)).toBeNull()
  })
})

describe('eventsInMonth', () => {
  it('returns published and cancelled events that start inside the Riyadh month, earliest first', async () => {
    const events = await eventsInMonth('2026-11')
    expect(events.length).toBeGreaterThan(0)
    const { from, to } = monthRangeUtc('2026-11')
    for (const e of events) {
      expect(['published', 'cancelled']).toContain(e.status)
      expect(Date.parse(e.startsAt)).toBeGreaterThanOrEqual(Date.parse(from))
      expect(Date.parse(e.startsAt)).toBeLessThan(Date.parse(to))
    }
    const starts = events.map((e) => Date.parse(e.startsAt))
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })

  it('includes cancelled events and past ones, never drafts', async () => {
    const ids = (await eventsInMonth('2026-11')).map((e) => e.id)
    expect(ids).toContain(STAND_IN_IDS.cancelled)
    expect(ids).toContain(STAND_IN_IDS.pastWithRecording)
    expect(ids).toContain(STAND_IN_IDS.pastNoRecording)
    expect(ids).not.toContain(STAND_IN_IDS.draft)
  })

  it('gives the next month its own events and an empty array for a month without any', async () => {
    const dec = await eventsInMonth('2026-12')
    expect(dec.length).toBeGreaterThan(0)
    for (const e of dec) expect(e.startsAt >= monthRangeUtc('2026-12').from).toBe(true)
    expect(await eventsInMonth('2020-01')).toEqual([])
  })

  it('never exposes the meeting link', async () => {
    for (const e of await eventsInMonth('2026-11')) {
      expect(Object.keys(e)).not.toContain('meetingUrl')
      expect(Object.keys(e)).not.toContain('meeting_url')
    }
  })
})

describe('toPublicEvent', () => {
  const row = {
    id: 7,
    title: 'ت',
    description: 'و',
    department_code: 'DEPT_1',
    starts_at: '2026-11-20T15:00:00Z',
    ends_at: '2026-11-20T17:00:00Z',
    format: 'online',
    location: null,
    presenter: 'Ali',
    capacity: 30,
    registration_closes_at: '2026-11-20T15:00:00Z',
    status: 'published',
    image_url: null,
    recording_url: null,
    meeting_url: 'https://meet.example/secret',
  }

  it('maps snake_case columns to camelCase fields', () => {
    expect(toPublicEvent(row)).toEqual({
      id: 7,
      title: 'ت',
      description: 'و',
      departmentCode: 'DEPT_1',
      startsAt: '2026-11-20T15:00:00Z',
      endsAt: '2026-11-20T17:00:00Z',
      format: 'online',
      location: null,
      presenter: 'Ali',
      capacity: 30,
      registrationClosesAt: '2026-11-20T15:00:00Z',
      status: 'published',
      imageUrl: null,
      recordingUrl: null,
    })
  })

  it('drops columns outside the public list, such as meeting_url', () => {
    expect(JSON.stringify(toPublicEvent(row))).not.toContain('secret')
  })

  it('PUBLIC_EVENT_COLUMNS is exactly the public fields, in snake_case', () => {
    expect(PUBLIC_EVENT_COLUMNS).toBe(
      'id,title,description,department_code,starts_at,ends_at,format,location,presenter,capacity,registration_closes_at,status,image_url,recording_url',
    )
    expect(PUBLIC_EVENT_COLUMNS).not.toContain('meeting')
  })
})
