import { describe, expect, it } from 'vitest'
import { buildMonthGrid, monthRangeUtc, nextMonth, parseMonthParam, prevMonth, weekdayNames } from '@/lib/events/month'

// dev-1 D1-10, month.test.ts: exactly the spec's cases, then the calendar's own helpers
describe('monthRangeUtc', () => {
  it('gives [from, to) in UTC for a Riyadh month', () => {
    expect(monthRangeUtc('2026-11')).toEqual({ from: '2026-10-31T21:00:00.000Z', to: '2026-11-30T21:00:00.000Z' })
  })
})

describe('buildMonthGrid', () => {
  it('lays November 2026 out in whole weeks that start on Sunday', () => {
    const grid = buildMonthGrid('2026-11')
    expect(grid).toHaveLength(35)
    expect(grid[0]).toBe('2026-11-01')
    expect(grid[34]).toBe('2026-12-05')
  })

  it('starts December 2026 on the last Sunday of November', () => {
    expect(buildMonthGrid('2026-12')[0]).toBe('2026-11-29')
  })
})

describe('nextMonth / prevMonth', () => {
  it('crosses the year', () => {
    expect(nextMonth('2026-12')).toBe('2027-01')
    expect(prevMonth('2026-01')).toBe('2025-12')
  })
})

describe('parseMonthParam', () => {
  it('falls back to the current Riyadh month for an invalid month', () => {
    expect(parseMonthParam('2026-13', new Date('2026-11-12T10:00:00Z'))).toBe('2026-11')
  })

  it('keeps a valid month', () => {
    expect(parseMonthParam('2026-11', new Date('2026-11-12T10:00:00Z'))).toBe('2026-11')
  })

  it('uses Riyadh time when there is no param: 22:00 UTC on 30 Nov is already December', () => {
    expect(parseMonthParam(undefined, new Date('2026-11-30T22:00:00Z'))).toBe('2026-12')
  })
})

describe('weekdayNames', () => {
  it('names the seven columns from Intl, Sunday first', () => {
    const names = weekdayNames('ar')
    expect(names).toHaveLength(7)
    expect(names[0]).toBe(new Intl.DateTimeFormat('ar', { weekday: 'long', timeZone: 'UTC' }).format(new Date('2026-11-01T12:00:00Z')))
    expect(names[0]).toContain('الأحد')
    expect(names[6]).toContain('السبت')
  })

  it('names them in English on English pages', () => {
    expect(weekdayNames('en')).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })
})
