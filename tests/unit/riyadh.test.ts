import { describe, expect, it } from 'vitest'
import { formatRiyadh, formatRiyadhTimeRange, riyadhDateKey, riyadhMonth } from '@/lib/time/riyadh'

describe('riyadhDateKey', () => {
  it('keeps the date while it is still the same day in Riyadh (UTC+3)', () => {
    expect(riyadhDateKey('2026-11-30T20:30:00Z')).toBe('2026-11-30')
  })

  it('moves to the next day once Riyadh passes midnight', () => {
    expect(riyadhDateKey('2026-11-30T21:30:00Z')).toBe('2026-12-01')
    expect(riyadhDateKey('2026-11-30T21:00:00Z')).toBe('2026-12-01')
    expect(riyadhDateKey('2026-11-30T20:59:59Z')).toBe('2026-11-30')
  })

  it('zero-pads month and day', () => {
    expect(riyadhDateKey('2027-01-04T09:00:00Z')).toBe('2027-01-04')
  })
})

describe('riyadhMonth', () => {
  it('uses the Riyadh date, so the month can roll over', () => {
    expect(riyadhMonth('2026-11-30T21:30:00Z')).toBe('2026-12')
    expect(riyadhMonth('2026-11-30T20:30:00Z')).toBe('2026-11')
  })
})

describe('formatRiyadh', () => {
  it('uses Eastern Arabic digits, as the brand guide requires', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date')).toBe('١٨ نوفمبر ٢٠٢٦')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date')).not.toMatch(/[0-9]/)
  })

  it('shows the time in Riyadh, not UTC', () => {
    const time = formatRiyadh('2026-11-18T15:00:00Z', 'time')
    expect(time).toContain('٦:٠٠')
    expect(time).not.toContain('١٥:٠٠')
  })

  it('uses the Gregorian calendar, not the Hijri default of ar-SA', () => {
    const date = formatRiyadh('2026-11-18T15:00:00Z', 'date')
    expect(date).toContain('١٨')
    expect(date).toContain('٢٠٢٦')
    expect(date).not.toContain('١٤٤٨')
  })

  it('names the month in Arabic', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date')).toContain('نوفمبر')
  })

  it('combines date and time for datetime', () => {
    const both = formatRiyadh('2026-11-18T15:00:00Z', 'datetime')
    expect(both).toContain('١٨')
    expect(both).toContain('٢٠٢٦')
    expect(both).toContain('٦:٠٠')
  })

  it('uses the Riyadh date near midnight', () => {
    expect(formatRiyadh('2026-11-30T21:30:00Z', 'date')).toContain('ديسمبر')
  })

  it('has the parts of the event card date block', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'day')).toBe('١٨')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month')).toBe('نوفمبر')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'weekday')).toBe('الأربعاء')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'monthYear')).toBe('نوفمبر ٢٠٢٦')
  })

  it('uses the Riyadh day for the day number', () => {
    expect(formatRiyadh('2026-11-30T21:30:00Z', 'day')).toBe('١')
  })
})

describe('formatRiyadhTimeRange', () => {
  it('shows start and end in Riyadh time, sharing the period', () => {
    const range = formatRiyadhTimeRange('2026-11-18T15:00:00Z', '2026-11-18T17:00:00Z')
    expect(range).toContain('٦:٠٠')
    expect(range).toContain('٨:٠٠')
    expect(range).not.toContain('١٥:٠٠')
  })

  it('names both periods when they differ', () => {
    const range = formatRiyadhTimeRange('2026-11-18T06:00:00Z', '2026-11-18T17:00:00Z')
    expect(range).toContain('ص')
    expect(range).toContain('م')
  })
})
