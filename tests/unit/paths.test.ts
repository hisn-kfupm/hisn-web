import { describe, expect, it } from 'vitest'
import { localeOfPath, localePath, switchLocalePath, withoutLocale } from '@/lib/i18n/paths'

/* dev-1 D1-5: every internal link carries the page's language; the switcher keeps the page and query */
describe('localePath', () => {
  it('puts the language in front of a site path', () => {
    expect(localePath('en', '/events')).toBe('/en/events')
    expect(localePath('ar', '/events/7')).toBe('/ar/events/7')
  })

  it('gives the bare language for the homepage, with no trailing slash (Next would redirect it)', () => {
    expect(localePath('ar', '/')).toBe('/ar')
    expect(localePath('en', '')).toBe('/en')
  })

  it('keeps the query and the hash', () => {
    expect(localePath('en', '/library?d=CYBERSECURITY')).toBe('/en/library?d=CYBERSECURITY')
    expect(localePath('ar', '/library#recording-9')).toBe('/ar/library#recording-9')
    expect(localePath('en', '/#departments')).toBe('/en#departments')
    expect(localePath('ar', '/?q=1')).toBe('/ar?q=1')
  })
})

describe('switchLocalePath', () => {
  it('opens the same page in the other language, query kept', () => {
    expect(switchLocalePath('/ar/events?m=2026-12', 'en')).toBe('/en/events?m=2026-12')
    expect(switchLocalePath('/en/events/7', 'ar')).toBe('/ar/events/7')
  })

  it('switches the homepage and keeps a hash', () => {
    expect(switchLocalePath('/ar', 'en')).toBe('/en')
    expect(switchLocalePath('/en?x=1', 'ar')).toBe('/ar?x=1')
    expect(switchLocalePath('/en/library#recording-9', 'ar')).toBe('/ar/library#recording-9')
  })

  it('replaces only a whole language segment', () => {
    expect(switchLocalePath('/arabic/events', 'en')).toBe('/en/arabic/events')
    expect(switchLocalePath('/en-gb', 'ar')).toBe('/ar/en-gb')
  })

  it('returns the same address when it is already in the target language', () => {
    expect(switchLocalePath('/en/events?m=2026-12', 'en')).toBe('/en/events?m=2026-12')
  })
})

describe('localeOfPath and withoutLocale', () => {
  it('reads the language segment, or null when there is none', () => {
    expect(localeOfPath('/en/events')).toBe('en')
    expect(localeOfPath('/ar')).toBe('ar')
    expect(localeOfPath('/admin')).toBeNull()
    expect(localeOfPath('/english')).toBeNull()
    expect(localeOfPath('/')).toBeNull()
  })

  it('drops the language segment', () => {
    expect(withoutLocale('/ar/events/7')).toBe('/events/7')
    expect(withoutLocale('/en')).toBe('/')
    expect(withoutLocale('/en?x=1')).toBe('/?x=1')
    expect(withoutLocale('/events')).toBe('/events')
  })
})
