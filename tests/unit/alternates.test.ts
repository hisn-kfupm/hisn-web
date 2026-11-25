import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Metadata } from 'next'
import { generateMetadata as layoutMetadata } from '@/app/[locale]/layout'
import { alternatesFor } from '@/lib/i18n/alternates'
import { departments } from '@/lib/data/labels'
import { standInPageIds } from '@/lib/events/stand-in'
import { LOCALES } from '@/lib/i18n/locale'

// the event page reads its row per request
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: vi.fn(async () => {}) }))

/* dev-1 D1-5, spec §6.6: every public page declares its ar, en and x-default (Arabic) addresses */
describe('alternatesFor', () => {
  it('lists the Arabic, English and x-default addresses', () => {
    expect(alternatesFor('/events').languages).toEqual({ ar: '/ar/events', en: '/en/events', 'x-default': '/ar/events' })
  })

  it('makes each language version its own canonical', () => {
    expect(alternatesFor('/events', 'en').canonical).toBe('/en/events')
    expect(alternatesFor('/events', 'ar').canonical).toBe('/ar/events')
  })

  it('gives the homepage without a trailing slash', () => {
    expect(alternatesFor('/', 'en')).toEqual({ canonical: '/en', languages: { ar: '/ar', en: '/en', 'x-default': '/ar' } })
  })
})

// method syntax: each page types its own params ({ locale, id }, { locale, slug }, …)
type Page = { generateMetadata(props: { params: Promise<Record<string, string>> }): Promise<Metadata> }

const slug = departments[0].slug
const eventId = String(standInPageIds()[0])

/** each public page: its module, its params besides the locale, and its path without the locale */
const PAGES: [string, () => Promise<Page>, Record<string, string>, string][] = [
  ['homepage', () => import('@/app/[locale]/page'), {}, '/'],
  ['calendar', () => import('@/app/[locale]/events/page'), {}, '/events'],
  ['event page', () => import('@/app/[locale]/events/[id]/page'), { id: eventId }, `/events/${eventId}`],
  ['department page', () => import('@/app/[locale]/departments/[slug]/page'), { slug }, `/departments/${slug}`],
  ['library', () => import('@/app/[locale]/library/page'), {}, '/library'],
  ['talent page', () => import('@/app/[locale]/talent/page'), {}, '/talent'],
  ['privacy page', () => import('@/app/[locale]/privacy/page'), {}, '/privacy'],
  ['image credits', () => import('@/app/[locale]/credits/page'), {}, '/credits'],
  ['sign-in', () => import('@/app/[locale]/sign-in/page'), {}, '/sign-in'],
]

describe('every public page lists its language versions', () => {
  for (const locale of LOCALES) {
    it.each(PAGES)(`%s on /${locale}`, async (_name, load, params, path) => {
      const { generateMetadata } = await load()
      const metadata = await generateMetadata({ params: Promise.resolve({ locale, ...params }) })
      expect(metadata.alternates).toEqual(alternatesFor(path, locale))
    })
  }
})

/* hreflang and canonical links must be absolute URLs; Next joins the paths above to metadataBase */
describe('the site origin', () => {
  afterEach(() => vi.unstubAllEnvs())
  const metadataBase = async () => (await layoutMetadata({ params: Promise.resolve({ locale: 'en' }) })).metadataBase

  it('comes from SITE_URL, the address the emails use too', async () => {
    vi.stubEnv('SITE_URL', 'https://hisn-sa.org')
    expect(String(await metadataBase())).toBe('https://hisn-sa.org/')
  })

  it('is left out when SITE_URL is unset or not a URL, so the links stay relative instead of pointing at localhost', async () => {
    vi.stubEnv('SITE_URL', '')
    expect(await metadataBase()).toBeUndefined()
    vi.stubEnv('SITE_URL', 'hisn-sa.org')
    expect(await metadataBase()).toBeUndefined()
  })
})
