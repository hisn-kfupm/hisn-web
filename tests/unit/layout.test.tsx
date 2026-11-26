import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

const nav = vi.hoisted(() => ({ pathname: '/ar' }))
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  usePathname: () => nav.pathname,
}))

import { notFound } from 'next/navigation'
import RootLayout, { generateStaticParams } from '@/app/[locale]/layout'
import GlobalNotFound from '@/app/global-not-found'
import AdminLayout from '@/app/admin/layout'
import { HeaderNav } from '@/components/HeaderNav'
import { DEFAULT_LOCALE, LOCALES, dirFor, isLocale } from '@/lib/i18n/locale'
import { t } from '@/lib/i18n/t'
import nextConfig from '@/next.config'

/* dev-1 D1-1 (spec revision 2.3): Arabic RTL at /ar, English LTR at /en, an Arabic-only admin */
const renderLayout = async (locale: string) => renderToStaticMarkup(await RootLayout({ children: <p>x</p>, params: Promise.resolve({ locale }) }))

describe('RootLayout (app/[locale]/layout.tsx)', () => {
  // asserted on <html> itself: the footer's <bdi lang="en"> would satisfy a plain toContain('lang="en"')
  it('renders Arabic, right to left, at /ar', async () => {
    expect(await renderLayout('ar')).toMatch(/<html lang="ar" dir="rtl"/)
  })

  it('renders English, left to right, at /en', async () => {
    expect(await renderLayout('en')).toMatch(/<html lang="en" dir="ltr"/)
  })

  it('calls notFound for any other locale', async () => {
    await expect(renderLayout('fr')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('prerenders exactly the two locales', () => {
    expect(generateStaticParams()).toEqual([{ locale: 'ar' }, { locale: 'en' }])
  })

  it('answers an address that matches no route with the site 404 page, header and footer included', () => {
    const html = renderToStaticMarkup(<GlobalNotFound />)
    expect(html).toMatch(/<html lang="ar" dir="rtl"/)
    expect(html).toContain(t('notFound.title'))
    expect(html).toContain('data-testid="site-header"')
    // without the flag Next ignores app/global-not-found.tsx and serves its bare default 404
    expect(nextConfig.experimental?.globalNotFound).toBe(true)
  })
})

describe('AdminLayout (app/admin/layout.tsx)', () => {
  it('renders an Arabic, right-to-left document', () => {
    expect(renderToStaticMarkup(<AdminLayout>x</AdminLayout>)).toMatch(/<html lang="ar" dir="rtl"/)
  })
})

describe('lib/i18n/locale', () => {
  it('knows the two locales and their directions', () => {
    expect(LOCALES).toEqual(['ar', 'en'])
    expect(DEFAULT_LOCALE).toBe('ar')
    expect(isLocale('en')).toBe(true)
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(dirFor('ar')).toBe('rtl')
    expect(dirFor('en')).toBe('ltr')
  })
})

describe('HeaderNav across the move to /ar and /en (D1-5 prefixes the links)', () => {
  const current = (pathname: string, href: string) => {
    nav.pathname = pathname
    const { unmount } = render(<HeaderNav label="nav" departmentsLabel="depts" departments={[]} items={[{ href, label: 'events' }, { href: href.replace('events', 'library'), label: 'library' }]} />)
    const marked = [screen.getByRole('link', { name: 'events' }), screen.getByRole('link', { name: 'library' })].map((a) => a.getAttribute('aria-current'))
    unmount()
    return marked
  }

  it('marks the current tab with today’s unprefixed links', () => {
    expect(current('/en/events', '/events')).toEqual(['page', null])
  })

  it('still marks it once the links carry the locale', () => {
    expect(current('/ar/events', '/ar/events')).toEqual(['page', null])
    expect(current('/en/events/9001', '/en/events')).toEqual(['page', null])
  })
})
