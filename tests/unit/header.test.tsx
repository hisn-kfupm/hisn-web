import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const nav = vi.hoisted(() => ({ pathname: '/ar', search: '' }))
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))
// the stand-in for D2-4's signOut(locale)
vi.mock('@/lib/auth/sign-out-stub', () => ({ signOut: vi.fn(async () => {}) }))

import { Header } from '@/components/Header'
import { signOut } from '@/lib/auth/sign-out-stub'
import { departments } from '@/lib/data/labels'
import { t } from '@/lib/i18n/t'

afterEach(() => {
  nav.pathname = '/ar'
  nav.search = ''
  vi.mocked(signOut).mockClear()
})

const authEntry = (container: HTMLElement) => container.querySelector('[data-testid="auth-entry"]')

/* dev-1 D1-5, spec §6.3 */
describe('Header', () => {
  it('signed out on /ar: the auth entry links to /ar/sign-in', () => {
    const { container } = render(<Header locale="ar" session={null} />)
    expect(authEntry(container)?.querySelector('a[href="/ar/sign-in"]')).not.toBeNull()
  })

  it('signed out on /en: the auth entry links to /en/sign-in', () => {
    nav.pathname = '/en'
    const { container } = render(<Header locale="en" session={null} />)
    expect(authEntry(container)?.querySelector('a[href="/en/sign-in"]')).not.toBeNull()
  })

  it('signed in: links to the account page and not to sign-in', () => {
    const { container } = render(<Header locale="ar" session={{ email: 'a@b.com' }} />)
    expect(container.querySelector('a[href="/ar/account"]')).not.toBeNull()
    expect(container.querySelector('a[href="/ar/sign-in"]')).toBeNull()
  })

  it('keeps the auth entry outside the mobile menu', () => {
    const { container } = render(<Header locale="ar" session={null} />)
    const entry = authEntry(container)
    const menu = container.querySelector('[data-testid="mobile-menu"]')
    expect(entry).not.toBeNull()
    expect(menu).not.toBeNull()
    expect(menu?.contains(entry)).toBe(false)
  })

  it('lists one link per department in the dropdown, each under /ar/departments/', () => {
    const { container } = render(<Header locale="ar" session={null} />)
    const links = container.querySelectorAll('[data-testid="dept-menu"] a')
    expect(links.length).toBe(departments.length)
    links.forEach((a) => expect(a.getAttribute('href')).toMatch(/^\/ar\/departments\//))
  })

  it('on /en every link stays in English: logo, sections, departments, sign-in', () => {
    nav.pathname = '/en'
    const { container } = render(<Header locale="en" session={null} />)
    const hrefs = [...container.querySelectorAll('a')].filter((a) => a.dataset.testid !== 'language-switcher').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/en')
    expect(hrefs).toContain('/en/events')
    expect(hrefs).toContain('/en/library')
    expect(hrefs).toContain('/en/talent')
    for (const href of hrefs) expect(href).toMatch(/^\/en(\/|$)/)
  })

  it('has a language switcher in the bar and another inside the mobile menu', () => {
    nav.pathname = '/ar/events'
    const { container } = render(<Header locale="ar" session={null} />)
    const menu = container.querySelector('[data-testid="mobile-menu"]')!
    const switchers = [...container.querySelectorAll('[data-testid="language-switcher"]')]
    expect(switchers.filter((a) => !menu.contains(a))).toHaveLength(1)
    expect(switchers.filter((a) => menu.contains(a))).toHaveLength(1)
    for (const a of switchers) expect(a.getAttribute('href')).toBe('/en/events')
  })

  it.each(['en', 'ar'] as const)('signing out on /%s calls signOut in that language', (locale) => {
    nav.pathname = `/${locale}`
    render(<Header locale={locale} session={{ email: 'a@b.com' }} />)
    fireEvent.click(screen.getByRole('button', { name: t(locale, 'auth.accountMenu') }))
    fireEvent.click(screen.getByRole('button', { name: t(locale, 'auth.signOut') }))
    expect(signOut).toHaveBeenCalledWith(locale)
  })
})
