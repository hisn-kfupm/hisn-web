import { describe, expect, it } from 'vitest'
import { arabicDigits, fmtNum } from '@/lib/i18n/number'

describe('fmtNum', () => {
  it('shows Eastern Arabic digits on Arabic pages', () => {
    expect(fmtNum(7, 'ar')).toBe('٧')
    expect(fmtNum(2026, 'ar', { useGrouping: false })).toBe('٢٠٢٦')
  })
  it('shows Latin digits on English pages', () => {
    expect(fmtNum(7, 'en')).toBe('7')
    expect(fmtNum(2026, 'en', { useGrouping: false })).toBe('2026')
  })
  it('pads section numbers to two digits', () => {
    expect(fmtNum(1, 'ar', { minimumIntegerDigits: 2 })).toBe('٠١')
    expect(fmtNum(1, 'en', { minimumIntegerDigits: 2 })).toBe('01')
  })
})

describe('arabicDigits', () => {
  it('turns Latin digits in an Arabic place into Eastern Arabic', () => {
    expect(arabicDigits('مبنى 58 · قاعة 102')).toBe('مبنى ٥٨ · قاعة ١٠٢')
  })
  it('leaves Latin text alone', () => {
    expect(arabicDigits('Building 58')).toBe('Building 58')
  })
})
