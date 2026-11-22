import { describe, expect, it } from 'vitest'
import { safeReturnTo } from '@/lib/auth/return-to'

/* CLAUDE.md: returnTo accepts only same-site relative paths */
describe('safeReturnTo', () => {
  it('keeps same-site paths, with their query and hash', () => {
    expect(safeReturnTo('/events/7')).toBe('/events/7')
    expect(safeReturnTo('/library?d=CAREER_READINESS#recording-9101')).toBe('/library?d=CAREER_READINESS#recording-9101')
  })

  it('sends everything else home', () => {
    for (const bad of [undefined, '', 'events', '//evil.example', '/\\evil.example', 'https://evil.example/x', 'javascript:alert(1)', '/%2F%2Fevil.example']) {
      expect(safeReturnTo(bad)).toBe('/')
    }
  })

  it('uses the first value when the parameter repeats', () => {
    expect(safeReturnTo(['/talent', '/events'])).toBe('/talent')
  })
})
