import { describe, expect, it } from 'vitest'
import { ALMOST_FULL_RATIO, isAlmostFull } from '@/lib/events/almost-full'

describe('isAlmostFull', () => {
  it('is true at or below 20% of capacity', () => {
    expect(ALMOST_FULL_RATIO).toBe(0.2)
    expect(isAlmostFull(30, 6)).toBe(true)
    expect(isAlmostFull(30, 7)).toBe(false)
    expect(isAlmostFull(10, 2)).toBe(true)
    expect(isAlmostFull(100, 20)).toBe(true)
    expect(isAlmostFull(100, 21)).toBe(false)
  })

  it('treats the last seat as almost full even for small events', () => {
    expect(isAlmostFull(4, 1)).toBe(true)
    expect(isAlmostFull(1, 1)).toBe(true)
    expect(isAlmostFull(4, 2)).toBe(false)
  })

  it('is false when the event is full', () => {
    expect(isAlmostFull(10, 0)).toBe(false)
  })

  it('is false without a capacity or a seat count', () => {
    expect(isAlmostFull(null, null)).toBe(false)
    expect(isAlmostFull(null, 3)).toBe(false)
    expect(isAlmostFull(30, null)).toBe(false)
  })
})
