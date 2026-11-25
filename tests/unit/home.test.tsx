import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { cacheLife } from 'next/cache'
import Home from '@/app/[locale]/page'
import { upcomingEvents, latestRecordings } from '@/lib/events/queries'
import { seatsTaken } from '@/lib/events/seats'
import { departments } from '@/lib/data/labels'
import { t } from '@/lib/i18n/t'

/** a page's props for one language */
const inLocale = (locale: 'ar' | 'en') => ({ params: Promise.resolve({ locale }) })

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }))

const NOW = new Date('2026-11-15T09:00:00Z')
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})
beforeEach(() => {
  vi.mocked(cacheLife).mockClear()
})

const section = (container: HTMLElement, id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement

describe('homepage', () => {
  it('caches for an hour (Cache Components replaces dev-1’s `revalidate = 3600`)', async () => {
    render(await Home(inLocale('ar')))
    expect(cacheLife).toHaveBeenCalledWith('hours')
  })

  it('is in English on /en: the slogan, its accent word and the strings', async () => {
    render(await Home(inLocale('en')))
    expect(screen.getAllByRole('heading', { level: 1 })[0].textContent).toBe(t('en', 'brand.slogan'))
    expect(screen.getByText(t('en', 'hero.accentWord'))).toBeInTheDocument()
    expect(screen.queryByText(t('ar', 'home.verbs.title'))).toBeNull()
  })

  it('keeps every link on /en in English', async () => {
    const { container } = render(await Home(inLocale('en')))
    const internal = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '').filter((href) => href.startsWith('/'))
    expect(internal.length).toBeGreaterThan(10)
    for (const href of internal) expect(href).toMatch(/^\/en(\/|$|#|\?)/)
  })

  it('has one h1: the slogan', async () => {
    render(await Home(inLocale('ar')))
    const h1 = screen.getAllByRole('heading', { level: 1 })
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe(t('ar', 'brand.slogan'))
  })

  it('gives the hero one primary action, to the events, and the major search as the second path', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const hero = section(container, 'hero')
    expect(within(hero).getByRole('link', { name: t('ar', 'home.hero.primary') }).getAttribute('href')).toBe('/ar/events')
    expect(within(hero).getByRole('combobox', { name: t('ar', 'hero.search.label') })).toBeInTheDocument()
  })

  it('lays five to seven photo bricks in the hero mosaic, never inside the copy', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const hero = section(container, 'hero')
    const photos = hero.querySelectorAll('[data-mosaic] img')
    expect(photos.length).toBeGreaterThanOrEqual(5)
    expect(photos.length).toBeLessThanOrEqual(7)
    expect(hero.querySelector('[data-hero-copy] img')).toBeNull()
    expect(hero.querySelector('[data-hero-copy] [data-mosaic]')).toBeNull()
  })

  it('shows the next event in the hero card', async () => {
    const [next] = await upcomingEvents({ limit: 1 })
    const { container } = render(await Home(inLocale('ar')))
    const card = section(container, 'next-event')
    expect(within(card).getByRole('link', { name: new RegExp(next.title) }).getAttribute('href')).toBe(`/ar/events/${next.id}`)
  })

  it('sets the three verbs of the approved description, each with a photo and one line', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const verbs = section(container, 'verbs')
    const words = [...verbs.querySelectorAll('[data-word]')].map((w) => w.textContent)
    expect(words).toEqual([t('ar', 'home.verbs.1.word'), t('ar', 'home.verbs.2.word'), t('ar', 'home.verbs.3.word')])
    const columns = verbs.querySelectorAll('li')
    expect(columns).toHaveLength(3)
    for (const col of columns) expect(col.querySelector('img')).not.toBeNull()
    expect(verbs.textContent).toContain(t('ar', 'home.verbs.1.line'))
  })

  it('shows the next three events as photo cards, each one link, with seat meters', async () => {
    const next = await upcomingEvents({ limit: 3 })
    const taken = await seatsTaken(next.map((e) => e.id))
    const { container } = render(await Home(inLocale('ar')))
    const upcoming = section(container, 'upcoming')
    const cards = [...upcoming.querySelectorAll('li[data-card]')]
    expect(cards).toHaveLength(next.length)
    expect(cards.map((c) => c.querySelector('h3 a')?.getAttribute('href'))).toEqual(next.map((e) => `/ar/events/${e.id}`))
    for (const card of cards) {
      expect(card.querySelectorAll('a')).toHaveLength(1)
      expect(card.querySelector('img')).not.toBeNull()
    }
    const metered = next.filter((e) => e.capacity !== null && taken.has(e.id))
    expect(metered.length).toBeGreaterThan(0)
    expect(upcoming.querySelectorAll('[data-testid="seat-meter"]')).toHaveLength(metered.length)
    expect(within(upcoming).getByRole('link', { name: t('ar', 'home.events.all') }).getAttribute('href')).toBe('/ar/events')
  })

  it('tiles the six departments, one link each to its page, with a photo, described by its summary', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const tiles = section(container, 'departments')
    const links = [...tiles.querySelectorAll('h3 a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(departments.map((d) => `/ar/departments/${d.slug}`))
    const described = links[0].getAttribute('aria-describedby')!
    expect(container.querySelector(`[id="${described}"]`)?.textContent).toBe(t('ar', `dept.${departments[0].code}.summary` as never))
    const items = tiles.querySelectorAll('li')
    expect(items).toHaveLength(departments.length)
    for (const item of items) {
      expect(item.querySelectorAll('a')).toHaveLength(1)
      expect(item.querySelector('img')).not.toBeNull()
    }
  })

  it('shows the four latest recordings as thumbnails, each linked into the library', async () => {
    const latest = await latestRecordings({ limit: 4 })
    const { container } = render(await Home(inLocale('ar')))
    const strip = section(container, 'recordings')
    expect(strip.querySelectorAll('article')).toHaveLength(latest.length)
    for (const e of latest) {
      expect(strip.textContent).toContain(e.title)
      expect(strip.querySelector(`a[href="/ar/library#recording-${e.id}"]`)).not.toBeNull()
    }
    expect(strip.querySelectorAll('img')).toHaveLength(latest.length)
    expect(within(strip).getByRole('link', { name: t('ar', 'home.recordings.all') }).getAttribute('href')).toBe('/ar/library')
  })

  it('invites to the talent base in one split band: a photo, the guide’s line and one CTA', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const band = section(container, 'talent')
    expect(band.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(t('ar', 'home.talent.line'))
    expect(band.querySelectorAll('img')).toHaveLength(1)
    const links = within(band).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/ar/talent')
    expect(links[0].textContent).toContain(t('ar', 'home.talent.cta'))
  })

  it('keeps the cut patterns out: no marquee, no drag strip, no pinned or stepped bands', async () => {
    const { container } = render(await Home(inLocale('ar')))
    expect(section(container, 'majors-band')).toBeNull()
    expect(container.querySelector('.drag-strip, [data-brick], [data-pin], canvas')).toBeNull()
  })

  it('numbers the sections in order', async () => {
    const { container } = render(await Home(inLocale('ar')))
    const numbers = [...container.querySelectorAll('[data-testid="section-number"]')].map((n) => n.textContent)
    expect(numbers).toEqual(['٠١', '٠٢', '٠٣', '٠٤'])
  })
})
