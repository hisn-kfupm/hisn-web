import { describe, expect, it } from 'vitest'
import { arabicDigits, fmtNum } from '@/lib/i18n/number'

describe('fmtNum', () => {
  it('shows Eastern Arabic digits', () => {
    expect(fmtNum(7)).toBe('٧')
    expect(fmtNum(2026, { useGrouping: false })).toBe('٢٠٢٦')
  })
  it('pads section numbers to two digits', () => {
    expect(fmtNum(1, { minimumIntegerDigits: 2 })).toBe('٠١')
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
