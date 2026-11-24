import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFound from '@/app/[locale]/not-found'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { localeOf, pageLocale } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'
import { setRootLocale } from '@/tests/stubs/root-params'

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

afterEach(() => setRootLocale('ar'))

/* dev-1 D1-2: every call is t(locale, …) with the page's locale */
describe('the page locale', () => {
  it('comes from params, and any other language is a 404', async () => {
    await expect(localeOf(Promise.resolve({ locale: 'en' }))).resolves.toBe('en')
    await expect(localeOf(Promise.resolve({ locale: 'fr' }))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('comes from the root segment where a page has no params', async () => {
    setRootLocale('en')
    await expect(pageLocale()).resolves.toBe('en')
    setRootLocale('fr')
    await expect(pageLocale()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('in English', () => {
  it('the 404 page follows the address', async () => {
    setRootLocale('en')
    render(await NotFound())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(t('en', 'notFound.title'))
    expect(screen.queryByText(t('ar', 'notFound.title'))).toBeNull()
  })

  it('the header has the English labels and Latin digits', () => {
    const { container } = render(<Header locale="en" session={null} />)
    expect(screen.getAllByText(t('en', 'nav.events')).length).toBeGreaterThan(0)
    expect(screen.queryByText(t('ar', 'nav.events'))).toBeNull()
    expect(container.textContent).not.toMatch(/[٠-٩]/)
  })

  it('the footer sets the closing line in English quotation marks', () => {
    // with the draft marker shown the line ends in «مؤقت» and is set plain; demos hide it
    process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS = '1'
    try {
      const { container } = render(<Footer locale="en" />)
      const marks = [...container.querySelectorAll('[data-closing] .text-mint')].map((mark) => mark.textContent)
      expect(marks).toEqual(['“', '”'])
    } finally {
      delete process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS
    }
  })
})
