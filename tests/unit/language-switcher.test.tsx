import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

const nav = vi.hoisted(() => ({ pathname: '/ar/events' as string | null, search: '' }))
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { t } from '@/lib/i18n/t'

afterEach(() => {
  nav.pathname = '/ar/events'
  nav.search = ''
})

/* dev-1 D1-5, spec §6.6: the same page in the other language, query kept */
describe('LanguageSwitcher', () => {
  it('on /ar/events?m=2026-12 links once to /en/events?m=2026-12', () => {
    nav.pathname = '/ar/events'
    nav.search = 'm=2026-12'
    const { container } = render(<LanguageSwitcher locale="ar" />)
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/en/events?m=2026-12')
  })

  it('names the other language in that language, marked with lang and hreflang', () => {
    const { container } = render(<LanguageSwitcher locale="ar" />)
    const link = container.querySelector('a')!
    expect(link.textContent).toBe(t('ar', 'lang.switch'))
    expect(link.getAttribute('lang')).toBe('en')
    expect(link.getAttribute('hreflang')).toBe('en')
  })

  it('from English goes back to the Arabic page', () => {
    nav.pathname = '/en/events/7'
    const { container } = render(<LanguageSwitcher locale="en" />)
    const link = container.querySelector('a')!
    expect(link.getAttribute('href')).toBe('/ar/events/7')
    expect(link.textContent).toBe(t('en', 'lang.switch'))
    expect(link.getAttribute('lang')).toBe('ar')
    expect(link.getAttribute('hreflang')).toBe('ar')
  })

  it('renders no link on a path without a language (the Arabic-only admin)', () => {
    nav.pathname = '/admin'
    const { container } = render(<LanguageSwitcher locale="ar" />)
    expect(container.querySelector('a')).toBeNull()
  })

  it('renders no link before the path is known', () => {
    nav.pathname = null
    const { container } = render(<LanguageSwitcher locale="ar" />)
    expect(container.querySelector('a')).toBeNull()
  })
})
