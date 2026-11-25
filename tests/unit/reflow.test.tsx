import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { render } from '@testing-library/react'
import TalentPage from '@/app/[locale]/talent/page'
import { CalendarHead } from '@/components/calendar/CalendarHead'
import { CreditsList } from '@/components/credits/CreditsList'
import { Header } from '@/components/Header'
import { NotFoundView } from '@/components/NotFoundView'
import { buttonClass } from '@/components/ui/button'

/*
  WCAG 1.4.10 reflow: at 320 px nothing may make the page scroll sideways or cut content off. jsdom
  has no layout, so these pin the rules that did (a headless sweep of every public page at
  320–1280 px, and a review that also looked for content cut off by its box, found them): a button
  label that could not wrap, a decorative wall of fixed-width bricks, a file name with no break
  opportunity, and the calendar's month links. The header bar is the exception: its buttons stay
  on one line.
*/
const css = readFileSync('app/globals.css', 'utf8')

/** the declarations of the first rule whose selector is exactly `selector` */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (!match) throw new Error(`no rule for ${selector} in app/globals.css`)
  return match[1]
}

/** a value in px or rem as px */
const px = (value: string) => (value.endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value))

const NO_WRAP = /white-space:\s*(nowrap|pre)\b|text-wrap(-mode)?:\s*nowrap/
const NO_WRAP_CLASS = /(^|\s)(whitespace-nowrap|whitespace-pre|text-nowrap)(\s|$)/

describe('nothing forces a 320 px screen to scroll sideways', () => {
  it('a button label wraps onto balanced, centred lines instead of widening its column', () => {
    const btn = rule('.btn')
    expect(btn).not.toMatch(NO_WRAP)
    expect(btn).toMatch(/text-wrap:\s*balance/)
    // an <a> otherwise aligns a wrapped label to the start; a <button> centres it
    expect(btn).toMatch(/text-align:\s*center/)
    for (const variant of ['primary', 'secondary', 'ghost'] as const)
      for (const size of ['sm', 'md', 'lg'] as const)
        for (const tone of ['light', 'dark'] as const)
          for (const block of [false, true]) expect(buttonClass({ variant, size, tone, block })).not.toMatch(NO_WRAP_CLASS)
  })

  it('except in the header bar, where the sign-in and account buttons stay on one line', () => {
    const signedOut = render(<Header locale="ar" session={null} />).container
    expect(signedOut.querySelector('[data-testid="auth-entry"] a')?.classList.contains('whitespace-nowrap')).toBe(true)
    const signedIn = render(<Header locale="ar" session={{ email: 'a@b.com' }} />).container
    expect(signedIn.querySelector('[data-testid="auth-entry"] button')?.classList.contains('whitespace-nowrap')).toBe(true)
  })

  it('below 360 px (not 359) the header shows sign-in as its icon, with the label kept for screen readers', () => {
    // Tailwind's max-[360px] is `width < 360px`
    const entry = render(<Header locale="en" session={null} />).container.querySelector('[data-testid="auth-entry"] a')!
    expect(entry.querySelector('span')?.className).toContain('max-[360px]:sr-only')
    expect(entry.querySelector('svg')?.getAttribute('class') ?? '').toContain('max-[360px]:block')
    expect(entry.className).toContain('max-[360px]:w-11')
    expect(entry.outerHTML).not.toContain('359px')
  })

  it('the talent page’s brick wall sizes its bricks from its own .wrap, never past their full size', () => {
    // 100cqi must be the width of the wall's own grid (.wrap), so that grid is the size container
    const brick = /--brick:\s*min\(4\.25rem,\s*\(100cqi\s*-\s*([\d.]+)px\)\s*\/\s*([\d.]+)\)/.exec(css)
    expect(brick).not.toBeNull()
    expect(rule('.socket-brick')).toMatch(/inline-size:\s*var\(--brick\)/)
    // the offset row is offset + 4 bricks + 3 gaps wide, and has to fit in 100cqi
    const gap = px(/gap:\s*([\d.]+(?:px|rem))/.exec(rule('.socket-row'))![1])
    const offset = /margin-inline-start:\s*calc\(var\(--brick\)\s*\*\s*([\d.]+)\s*\/\s*4\.25\)/.exec(rule('.socket-row:nth-child(2)'))
    expect(offset).not.toBeNull()
    expect(Number(brick![1])).toBe(3 * gap)
    expect(Number(brick![2])).toBeGreaterThanOrEqual(4 + Number(offset![1]) / 4.25)
  })

  it('the talent page makes the wall’s own .wrap that size container', async () => {
    const { container } = render(await TalentPage({ params: Promise.resolve({ locale: 'en' }) }))
    const wall = container.querySelector('.socket-wall')!
    expect(wall.parentElement?.classList.contains('wrap')).toBe(true)
    expect(wall.parentElement?.classList.contains('@container')).toBe(true)
  })

  it('the credits break a long file name anywhere rather than run past the column', () => {
    const credit = { file: 'x.jpg', title: 'RochesterAcademyOfScienceAnnualSpringLecture2024DrakeEquationWithData.jpg', author: 'DanielPenfield', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/' }
    const { container } = render(<CreditsList locale="en" credits={[credit]} />)
    // the nearest element that sets overflow-wrap decides it (break-words on the link would undo it)
    const setter = container.querySelector('bdi')!.closest('.wrap-anywhere, .break-words, .wrap-break-word, .wrap-normal, .break-normal, .break-all')
    expect(setter?.classList.contains('wrap-anywhere')).toBe(true)
  })

  it('below 375 px the calendar’s month links drop the divider and use smaller squares, gaps and names', () => {
    // English month names are long: at 320 px «September | November» cut the next square off
    const { container } = render(<CalendarHead locale="en" month="2026-10" now={Date.parse('2026-10-15T09:00:00Z')} count={0} eventDays={[]} />)
    const next = container.querySelector('[data-month-link="next"]')!
    const nav = next.closest('nav')!
    const compact = 'max-[23.4375rem]:'
    expect(nav.className).toContain(`${compact}gap-4`)
    expect(nav.querySelector('i')?.className).toContain(`${compact}hidden`)
    expect(next.className).toContain(`${compact}gap-2`)
    expect(next.querySelector('.btn')?.className).toContain(`${compact}size-12`)
    expect(next.querySelector('span[aria-hidden]')?.className).toContain(`${compact}text-[0.9375rem]`)
  })

  it('the 404 page’s two buttons wrap as whole buttons beside each other', () => {
    const { container } = render(<NotFoundView locale="en" />)
    const row = container.querySelector('a[href="/en/events"]')!.parentElement!
    expect(row.className).toContain('sm:flex-wrap')
  })
})
