import { describe, expect, it } from 'vitest'
import { formatRiyadh, formatRiyadhTimeRange, riyadhDateKey, riyadhMonth } from '@/lib/time/riyadh'

/*
  dev-1 D1-7: Riyadh time in both languages. Arabic uses the brand guide's Eastern Arabic digits
  (RIYADH_LOCALE, approved by Abdulaziz), English uses Latin digits and a 12-hour clock.
*/
const ARABIC_LETTERS = /[؀-ۿ]/

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

describe('formatRiyadh in Arabic', () => {
  it('uses Eastern Arabic digits, as the brand guide requires', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date', 'ar')).toBe('١٨ نوفمبر ٢٠٢٦')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date', 'ar')).not.toMatch(/[0-9]/)
  })

  it('shows the time in Riyadh, not UTC', () => {
    const time = formatRiyadh('2026-11-18T15:00:00Z', 'time', 'ar')
    expect(time).toContain('٦:٠٠')
    expect(time).not.toContain('١٥:٠٠')
  })

  it('uses the Gregorian calendar, not the Hijri default of ar-SA', () => {
    const date = formatRiyadh('2026-11-18T15:00:00Z', 'date', 'ar')
    expect(date).toContain('١٨')
    expect(date).toContain('٢٠٢٦')
    expect(date).not.toContain('١٤٤٨')
  })

  it('names the month in Arabic', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'date', 'ar')).toContain('نوفمبر')
  })

  it('combines date and time for datetime', () => {
    const both = formatRiyadh('2026-11-18T15:00:00Z', 'datetime', 'ar')
    expect(both).toContain('١٨')
    expect(both).toContain('٢٠٢٦')
    expect(both).toContain('٦:٠٠')
  })

  it('uses the Riyadh date near midnight', () => {
    expect(formatRiyadh('2026-11-30T21:30:00Z', 'date', 'ar')).toContain('ديسمبر')
  })

  it('has the parts of the event card date block', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'day', 'ar')).toBe('١٨')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month', 'ar')).toBe('نوفمبر')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'weekday', 'ar')).toBe('الأربعاء')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'monthYear', 'ar')).toBe('نوفمبر ٢٠٢٦')
  })

  it('uses the Riyadh day for the day number', () => {
    expect(formatRiyadh('2026-11-30T21:30:00Z', 'day', 'ar')).toBe('١')
  })
})

describe('formatRiyadh in English', () => {
  it('shows a 12-hour Riyadh time, like the Arabic', () => {
    const time = formatRiyadh('2026-11-18T15:00:00Z', 'time', 'en')
    expect(time).toContain('6:00')
    expect(time).toContain('pm')
    expect(time).not.toContain('18:00')
    expect(time).not.toContain('15:00')
  })

  it('uses the Gregorian calendar, Latin digits and English month names', () => {
    const date = formatRiyadh('2026-11-18T15:00:00Z', 'date', 'en')
    expect(date).toContain('18')
    expect(date).toContain('2026')
    expect(date).not.toContain('1448')
    expect(date).not.toMatch(ARABIC_LETTERS)
    expect(date).toBe('18 November 2026')
  })

  it('shows the Riyadh day near midnight: 21:30 UTC on 30 November is 1 December', () => {
    const date = formatRiyadh('2026-11-30T21:30:00Z', 'date', 'en')
    expect(date).not.toContain('30')
    expect(date).toBe('1 December 2026')
  })

  it('combines date and time for datetime', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'datetime', 'en')).toMatch(/^18 November 2026\D+6:00\spm$/)
  })

  it('has the parts of the event card date block', () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'day', 'en')).toBe('18')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month', 'en')).toBe('November')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'weekday', 'en')).toBe('Wednesday')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'monthYear', 'en')).toBe('November 2026')
    expect(formatRiyadh('2026-11-30T21:30:00Z', 'day', 'en')).toBe('1')
  })

  it("keeps each language's formats apart", () => {
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month', 'ar')).toBe('نوفمبر')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month', 'en')).toBe('November')
    expect(formatRiyadh('2026-11-18T15:00:00Z', 'month', 'ar')).toBe('نوفمبر')
  })
})

describe('formatRiyadhTimeRange', () => {
  it('shows start and end in Riyadh time, sharing the period', () => {
    const range = formatRiyadhTimeRange('2026-11-18T15:00:00Z', '2026-11-18T17:00:00Z', 'ar')
    expect(range).toContain('٦:٠٠')
    expect(range).toContain('٨:٠٠')
    expect(range).not.toContain('١٥:٠٠')
  })

  it('names both periods when they differ', () => {
    const range = formatRiyadhTimeRange('2026-11-18T06:00:00Z', '2026-11-18T17:00:00Z', 'ar')
    expect(range).toContain('ص')
    expect(range).toContain('م')
  })

  it('in English: 12-hour Riyadh times that share the period', () => {
    const range = formatRiyadhTimeRange('2026-11-18T15:00:00Z', '2026-11-18T17:00:00Z', 'en')
    expect(range).toMatch(/^6:00\s*–\s*8:00\spm$/)
    expect(range).not.toContain('15:00')
  })

  it('in English: names both periods when they differ', () => {
    expect(formatRiyadhTimeRange('2026-11-18T06:00:00Z', '2026-11-18T17:00:00Z', 'en')).toMatch(/^9:00\sam\s*–\s*8:00\spm$/)
  })
})
