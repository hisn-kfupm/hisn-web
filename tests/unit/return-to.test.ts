import { describe, expect, it } from 'vitest'
import { isInstitutionalEmail, safeReturnTo, signInReturnTo } from '@/lib/auth/return-to'

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

  /* dev-2 D2-4 */
  it('keeps unprefixed, locale-prefixed and admin paths', () => {
    expect(safeReturnTo('/events/3')).toBe('/events/3')
    expect(safeReturnTo('/events?m=2026-11')).toBe('/events?m=2026-11')
    expect(safeReturnTo('/ar/events/3')).toBe('/ar/events/3')
    expect(safeReturnTo('/en/events?m=2026-11')).toBe('/en/events?m=2026-11')
    // the admin guard sends people to /ar/sign-in?returnTo=/admin (D1-13)
    expect(safeReturnTo('/admin')).toBe('/admin')
  })

  it('sends off-site and script addresses home', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) {
      expect(safeReturnTo(bad), bad).toBe('/')
    }
  })

  it('sends null and the empty string home', () => {
    expect(safeReturnTo(null)).toBe('/')
    expect(safeReturnTo('')).toBe('/')
  })

  it('keeps a path of 512 characters and sends a longer one home', () => {
    const path = (length: number) => '/' + 'a'.repeat(length - 1)
    expect(safeReturnTo(path(512))).toBe(path(512))
    expect(safeReturnTo(path(513))).toBe('/')
  })
})

/* dev-2 D2-5: the sign-in page's returnTo stays same-site and in the page's language */
describe('signInReturnTo', () => {
  it("goes to the page language's homepage when there is nothing usable", () => {
    expect(signInReturnTo(undefined, 'en')).toBe('/en')
    expect(signInReturnTo('//evil.com', 'en')).toBe('/en')
    expect(signInReturnTo('/', 'ar')).toBe('/ar')
  })

  it('keeps a path that has its language, and the admin', () => {
    expect(signInReturnTo('/ar/events/3', 'en')).toBe('/ar/events/3')
    expect(signInReturnTo('/en/events?m=2026-11', 'en')).toBe('/en/events?m=2026-11')
    expect(signInReturnTo('/admin', 'ar')).toBe('/admin')
  })

  it("gives an old link without a language the page's", () => {
    expect(signInReturnTo('/events/3', 'en')).toBe('/en/events/3')
    expect(signInReturnTo('/library?d=CAREER_READINESS', 'ar')).toBe('/ar/library?d=CAREER_READINESS')
  })
})

/* dev-2 D2-4: sign-in warns (without blocking) that a university address ends at graduation */
describe('isInstitutionalEmail', () => {
  it('flags university addresses', () => {
    expect(isInstitutionalEmail('a@kfupm.edu.sa')).toBe(true)
    expect(isInstitutionalEmail('a@stanford.edu')).toBe(true)
  })

  it('leaves other addresses alone', () => {
    expect(isInstitutionalEmail('a@gmail.com')).toBe(false)
    expect(isInstitutionalEmail('a@edu.sa.com')).toBe(false)
  })

  it('reads the domain in any case, and needs an @', () => {
    expect(isInstitutionalEmail('A@KFUPM.EDU.SA')).toBe(true)
    expect(isInstitutionalEmail('kfupm.edu.sa')).toBe(false)
  })
})
