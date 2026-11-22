import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import { MonthGrid } from '@/components/MonthGrid'
import { EventList } from '@/components/EventList'
import { CalendarView } from '@/components/calendar/CalendarView'
import { eventCover } from '@/lib/data/images'
import { calendarStatus } from '@/lib/events/calendar-status'
import { loadCalendar } from '@/lib/events/calendar'
import { upcomingEvents } from '@/lib/events/queries'
import type { PublicEvent } from '@/lib/events/types'
import { t } from '@/lib/i18n/t'

/* dev-1 D1-10: the calendar's grid, list, badges and next-event banner; revision 04 §5 turns the
   banner into a featured next-event card with a photo at the top and adds thumbnails to the list */
const NOW = Date.parse('2026-11-15T09:00:00Z')

const ev = (over: Partial<PublicEvent>): PublicEvent => ({
  id: 1,
  title: 'فعالية',
  description: 'وصف',
  departmentCode: 'SECTOR_AWARENESS',
  startsAt: '2026-11-18T15:00:00Z',
  endsAt: '2026-11-18T17:00:00Z',
  format: 'in_person',
  location: 'مبنى 58',
  presenter: null,
  capacity: 25,
  registrationClosesAt: '2026-11-18T15:00:00Z',
  status: 'published',
  imageUrl: null,
  recordingUrl: null,
  ...over,
})

const upcoming = ev({ id: 1, title: 'قادمة' })
const almost = ev({ id: 2, title: 'شبه ممتلئة', startsAt: '2026-11-18T18:00:00Z', endsAt: '2026-11-18T19:00:00Z' })
const ended = ev({ id: 3, title: 'منتهية', startsAt: '2026-11-03T15:00:00Z', endsAt: '2026-11-03T17:00:00Z', recordingUrl: 'https://youtu.be/x' })
const cancelled = ev({ id: 4, title: 'ملغاة', status: 'cancelled', startsAt: '2026-11-24T15:00:00Z', endsAt: '2026-11-24T17:00:00Z' })
// 22:30 UTC on the 20th is 01:30 on the 21st in Riyadh
const lateNight = ev({ id: 5, title: 'بعد منتصف الليل', startsAt: '2026-11-20T22:30:00Z', endsAt: '2026-11-20T23:30:00Z' })
const events = [ended, upcoming, almost, lateNight, cancelled]
const seats = new Map<number, number | null>([[1, 20], [2, 2], [3, null], [4, 10], [5, null]])

describe('calendarStatus', () => {
  it('orders cancelled → ended → full → almost full → open', () => {
    expect(calendarStatus(cancelled, 0, NOW)).toBe('cancelled')
    expect(calendarStatus(ended, 0, NOW)).toBe('ended')
    expect(calendarStatus(upcoming, 0, NOW)).toBe('full')
    expect(calendarStatus(almost, 2, NOW)).toBe('almostFull')
    expect(calendarStatus(almost, null, NOW)).toBe('open')
    expect(calendarStatus(upcoming, 20, NOW)).toBe('open')
  })
})

describe('MonthGrid', () => {
  const grid = () => render(<MonthGrid month="2026-11" events={events} seatsLeft={seats} now={NOW} />).container

  it('shows at md and up only, in whole weeks of seven starting on Sunday', () => {
    const root = grid().querySelector('[data-testid="month-grid"]') as HTMLElement
    expect(root.className).toMatch(/(^|\s)hidden(\s|$)/)
    expect(root.className).toContain('md:block')
    expect(root.querySelectorAll('[data-date]')).toHaveLength(35)
    const heads = within(root).getAllByRole('columnheader')
    expect(heads).toHaveLength(7)
    expect(heads[0].textContent).toContain('الأحد')
    expect(root.querySelectorAll('[data-week]')).toHaveLength(5)
  })

  it('groups events by their Riyadh day', () => {
    const root = grid()
    const cell = root.querySelector('[data-date="2026-11-21"]') as HTMLElement
    expect(cell.textContent).toContain('بعد منتصف الليل')
    expect(root.querySelector('[data-date="2026-11-20"]')?.textContent).not.toContain('بعد منتصف الليل')
    expect(root.querySelector('[data-date="2026-11-18"]')?.querySelectorAll('[data-event]')).toHaveLength(2)
  })

  it('marks today and the days outside the month', () => {
    const root = grid()
    expect(root.querySelector('[data-date="2026-11-15"]')?.hasAttribute('data-today')).toBe(true)
    expect(root.querySelector('[data-date="2026-12-01"]')?.hasAttribute('data-outside')).toBe(true)
    expect(root.querySelector('[data-date="2026-11-01"]')?.hasAttribute('data-outside')).toBe(false)
  })

  it('links each event and badges it: ended, cancelled, almost full', () => {
    const root = grid()
    const brick = (id: number) => root.querySelector(`[data-event="${id}"]`) as HTMLElement
    expect(within(brick(1)).getByRole('link').getAttribute('href')).toBe('/events/1')
    expect(brick(3).textContent).toContain(t('event.badge.ended'))
    expect(brick(4).textContent).toContain(t('event.badge.cancelled'))
    expect(brick(2).textContent).toContain(t('event.badge.almostFull'))
    expect(brick(1).textContent).not.toContain(t('event.badge.almostFull'))
    expect(brick(5).textContent).not.toContain(t('event.badge.almostFull'))
  })
})

describe('EventList', () => {
  const list = () => render(<EventList month="2026-11" events={events} seatsLeft={seats} now={NOW} />).container

  it('shows below md only, one group per Riyadh day that has events', () => {
    const root = list().querySelector('[data-testid="event-list"]') as HTMLElement
    expect(root.className).toContain('md:hidden')
    const days = [...root.querySelectorAll('[data-day-group]')].map((g) => g.getAttribute('data-day-group'))
    expect(days).toEqual(['2026-11-03', '2026-11-18', '2026-11-21', '2026-11-24'])
    expect(root.querySelector('[data-day-group="2026-11-18"]')?.querySelectorAll('[data-event]')).toHaveLength(2)
  })

  it('badges rows the same way and shows seat meters only for open events', () => {
    const root = list()
    const row = (id: number) => root.querySelector(`[data-event="${id}"]`) as HTMLElement
    expect(row(3).textContent).toContain(t('event.badge.ended'))
    expect(row(4).textContent).toContain(t('event.badge.cancelled'))
    expect(row(2).textContent).toContain(t('event.badge.almostFull'))
    expect(row(1).querySelector('[data-testid="seat-meter"]')).not.toBeNull()
    expect(row(4).querySelector('[data-testid="seat-meter"]')).toBeNull()
  })

  it('gives each row a small thumbnail of the event cover', () => {
    const root = list()
    for (const e of events) {
      const img = root.querySelector(`[data-event="${e.id}"] img`) as HTMLImageElement
      expect(img.getAttribute('alt')).toBe('')
      expect(decodeURIComponent(img.getAttribute('srcset') ?? '')).toContain(eventCover(e).src)
    }
  })
})

describe('CalendarView', () => {
  it('features the next event with its photo, and links to its month when that is another month', () => {
    const next = ev({ id: 77, title: 'التالية', startsAt: '2026-12-02T15:00:00Z', endsAt: '2026-12-02T17:00:00Z' })
    const { container } = render(<CalendarView month="2026-10" events={[]} seatsLeft={new Map()} now={NOW} next={next} />)
    const banner = container.querySelector('[data-testid="next-banner"]') as HTMLElement
    expect(within(banner).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/events/77', '/events?m=2026-12'])
    expect(decodeURIComponent(banner.querySelector('img')?.getAttribute('srcset') ?? '')).toContain(eventCover(next).src)
    expect(container.textContent).toContain(t('calendar.empty'))
  })

  it('features the next event above the month even when the month still has events ahead', () => {
    const { container } = render(<CalendarView month="2026-11" events={events} seatsLeft={seats} now={NOW} next={upcoming} />)
    const banner = container.querySelector('[data-testid="next-banner"]') as HTMLElement
    // the event is in the month on screen, so there is no "its month" link
    expect(within(banner).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/events/1'])
    for (const id of ['month-grid', 'event-list']) {
      const after = container.querySelector(`[data-testid="${id}"]`) as HTMLElement
      expect(banner.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('omits the banner without a next event', () => {
    const { container } = render(<CalendarView month="2026-10" events={[]} seatsLeft={new Map()} now={NOW} next={null} />)
    expect(container.querySelector('[data-testid="next-banner"]')).toBeNull()
  })
})

describe('loadCalendar (stand-in)', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterAll(() => vi.useRealTimers())

  it('features the next upcoming event even for a month with events still ahead', async () => {
    const [first] = await upcomingEvents({ limit: 1 })
    const data = await loadCalendar('2026-11', new Date(NOW))
    expect(data.month).toBe('2026-11')
    expect(data.events.length).toBeGreaterThan(0)
    expect(data.next?.id).toBe(first.id)
  })

  it('links a past or empty month to the next upcoming event', async () => {
    const [first] = await upcomingEvents({ limit: 1 })
    expect((await loadCalendar('2026-10', new Date(NOW))).next?.id).toBe(first.id)
    const empty = await loadCalendar('2020-01', new Date(NOW))
    expect(empty.events).toEqual([])
    expect(empty.next?.id).toBe(first.id)
  })

  it('falls back to the current month and reads seats for every event', async () => {
    const data = await loadCalendar('nope', new Date(NOW))
    expect(data.month).toBe('2026-11')
    for (const e of data.events) expect(data.seatsLeft.has(e.id)).toBe(true)
  })
})
