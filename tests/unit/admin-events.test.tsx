import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/*
  dev-1 D1-13: the admin events list (spec §7.11). The guard is mocked (admin-guard.test.ts covers
  it) and the database is the stand-in's in-memory client, filled per test and wrapped to record
  the ranges the loader asks for.
*/
const db = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]>, ranges: [] as [number, number][] }))

vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
vi.mock('@/lib/admin/require-admin', () => ({ requireAdmin: vi.fn(async () => ({ userId: 'u1' })) }))
vi.mock('@/lib/db/prod-stub', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/prod-stub')>()
  return {
    ...actual,
    supabaseProdServer: vi.fn(async () => {
      const client = actual.memoryClient(db.tables)
      return {
        from(table: string) {
          const query = client.from(table)
          const range = query.range.bind(query)
          query.range = (from: number, to: number) => {
            db.ranges.push([from, to])
            return range(from, to)
          }
          return query
        },
      }
    }),
  }
})

import { requireAdmin } from '@/lib/admin/require-admin'
import { adminEvents, REGISTRATIONS_PAGE } from '@/lib/admin/events'
import { supabaseProdServer } from '@/lib/db/prod-stub'
import { fmtNum } from '@/lib/i18n/number'
import { t } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'
import AdminEventsPage from '@/app/admin/page'

const NOW = Date.parse('2026-11-24T09:00:00Z')
const DAY = 86_400_000
const at = (days: number) => new Date(NOW + days * DAY).toISOString()
const event = (id: number, days: number, extra: Record<string, unknown> = {}) => ({
  id,
  title: `فعالية ${id}`,
  starts_at: at(days),
  ends_at: new Date(NOW + days * DAY + 2 * 3_600_000).toISOString(),
  status: 'published',
  capacity: 30,
  announcement_started_at: null,
  ...extra,
})
const regs = (eventId: number, status: string, n: number) => Array.from({ length: n }, () => ({ event_id: eventId, status }))

function fill(events: Record<string, unknown>[], registrations: Record<string, unknown>[]) {
  db.tables = { events, registrations: registrations.map((r, i) => ({ id: i + 1, ...r })) }
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockClear()
  vi.mocked(supabaseProdServer).mockClear()
  db.ranges = []
  fill(
    [
      event(3, -5),
      event(1, 2, { announcement_started_at: at(-1) }),
      event(4, -20, { status: 'cancelled', capacity: 40 }),
      event(2, 10, { status: 'draft', capacity: null }),
    ],
    [...regs(1, 'registered', 12), ...regs(1, 'waitlisted', 3), ...regs(1, 'cancelled', 2), ...regs(3, 'registered', 20)],
  )
})

describe('adminEvents', () => {
  it('puts events that have not ended first, soonest first, then past ones, latest first, drafts included', async () => {
    const { upcoming, past } = await adminEvents(NOW)
    expect(upcoming.map((e) => e.id)).toEqual([1, 2])
    expect(past.map((e) => e.id)).toEqual([3, 4])
  })

  it('counts registered and waitlisted people per event', async () => {
    const { upcoming, past } = await adminEvents(NOW)
    expect(upcoming[0]).toMatchObject({ id: 1, registered: 12, waitlisted: 3, capacity: 30 })
    expect(upcoming[1]).toMatchObject({ id: 2, registered: 0, waitlisted: 0, capacity: null, status: 'draft' })
    expect(past[0]).toMatchObject({ id: 3, registered: 20, waitlisted: 0 })
  })

  it('reads registrations page by page, past the API row limit', async () => {
    fill([event(1, 2, { capacity: null })], regs(1, 'registered', 2 * REGISTRATIONS_PAGE + 500))
    const { upcoming } = await adminEvents(NOW)
    expect(upcoming[0].registered).toBe(2 * REGISTRATIONS_PAGE + 500)
    expect(db.ranges).toEqual([
      [0, REGISTRATIONS_PAGE - 1],
      [REGISTRATIONS_PAGE, 2 * REGISTRATIONS_PAGE - 1],
      [2 * REGISTRATIONS_PAGE, 3 * REGISTRATIONS_PAGE - 1],
    ])
  })

  it('fails loudly when the database returns an error, rather than showing wrong counts', async () => {
    vi.mocked(supabaseProdServer).mockImplementationOnce(async () => ({
      from: () => ({ select: () => ({ order: async () => ({ data: null, error: { message: 'permission denied' } }) }) }),
    }) as never)
    await expect(adminEvents(NOW)).rejects.toThrow('permission denied')
  })
})

describe('/admin', () => {
  async function renderPage() {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    try {
      return render(await AdminEventsPage())
    } finally {
      vi.useRealTimers()
    }
  }
  const row = (title: string) => screen.getByRole('row', { name: new RegExp(title) })

  it('checks the visitor is an admin before reading any event', async () => {
    await renderPage()
    expect(requireAdmin).toHaveBeenCalledTimes(1)
    expect(vi.mocked(requireAdmin).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(supabaseProdServer).mock.invocationCallOrder[0])
  })

  it('has one h1 and a link to create an event', async () => {
    await renderPage()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([t('ar', 'admin.events.title')])
    expect(screen.getByRole('link', { name: t('ar', 'admin.events.new') }).getAttribute('href')).toBe('/admin/events/new')
  })

  it('shows each column for an event: title, Riyadh date, status, seats, waitlist, announcement, edit link', async () => {
    await renderPage()
    const first = row('فعالية 1')
    const cells = within(first)
    expect(first.textContent).toContain(formatRiyadh(at(2), 'datetime'))
    expect(first.textContent).toContain(t('ar', 'admin.status.published'))
    expect(first.textContent).toContain(`${fmtNum(12, 'ar')} / ${fmtNum(30, 'ar')}`)
    expect(cells.getByText(fmtNum(3, 'ar'))).toBeInTheDocument()
    expect(first.textContent).toContain(t('ar', 'admin.announce.started'))
    expect(cells.getByRole('link', { name: t('ar', 'admin.events.edit', { title: 'فعالية 1' }) }).getAttribute('href')).toBe('/admin/events/1')
  })

  it('shows ∞ for an event without a seat limit, and «not sent» before an announcement', async () => {
    await renderPage()
    const draft = row('فعالية 2')
    expect(draft.textContent).toContain(`${fmtNum(0, 'ar')} / ∞`)
    expect(draft.textContent).toContain(t('ar', 'event.ledger.noCapacity'))
    expect(draft.textContent).toContain(t('ar', 'admin.status.draft'))
    expect(draft.textContent).toContain(t('ar', 'admin.announce.notSent'))
  })

  it('lists upcoming and past events in two tables, in that order', async () => {
    await renderPage()
    const [upcoming, past] = screen.getAllByRole('table')
    const titles = (table: HTMLElement) => within(table).getAllByRole('row').slice(1).map((r) => within(r).getByRole('rowheader').textContent)
    expect(titles(upcoming)).toEqual(['فعالية 1', 'فعالية 2'])
    expect(titles(past)).toEqual(['فعالية 3', 'فعالية 4'])
  })

  it('says so when a group has no events', async () => {
    fill([event(1, 2)], [])
    await renderPage()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByText(t('ar', 'admin.events.none'))).toBeInTheDocument()
  })
})
