import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { notFound } from 'next/navigation'
import { generateStaticParams } from '@/app/[locale]/departments/[slug]/page'
import { DepartmentView } from '@/components/department/DepartmentView'
import { upcomingEvents } from '@/lib/events/queries'
import { departments } from '@/lib/data/labels'
import { t, type StringKey } from '@/lib/i18n/t'

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }))
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))
vi.mock('@/lib/events/queries', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/events/queries')>()
  return { ...real, upcomingEvents: vi.fn(real.upcomingEvents) }
})

const NOW = new Date('2026-11-15T09:00:00Z')
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})
beforeEach(() => {
  vi.mocked(upcomingEvents).mockClear()
  vi.mocked(notFound).mockClear()
})

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

/*
  dev-1 D1-9. The page renders DepartmentView inside <Suspense> (instant navigation under Cache
  Components), so the render checks call the view with the page's params.
*/
describe('department pages', () => {
  it('generateStaticParams returns one entry per department, in the data file order', async () => {
    const entries = await generateStaticParams()
    expect(entries).toHaveLength(6)
    expect(entries.map((e) => e.slug)).toEqual(departments.map((d) => d.slug))
  })

  it('an unknown slug calls notFound', async () => {
    await expect(DepartmentView(params('nope'))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it('asks for six upcoming events of its own department', async () => {
    render(await DepartmentView(params(departments[0].slug)))
    expect(upcomingEvents).toHaveBeenCalledWith({ limit: 6, departmentCode: departments[0].code })
  })

  it('has one h1, the department name, and renders only the roles that have text', async () => {
    const d = departments[0]
    const { container } = render(await DepartmentView(params(d.slug)))
    const h1 = screen.getAllByRole('heading', { level: 1 })
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe(t(`dept.${d.code}.title` as StringKey))
    const expected = [1, 2, 3, 4].map((n) => t(`dept.${d.code}.role${n}` as StringKey)).filter((r) => r.trim() !== '')
    const roles = container.querySelectorAll('[data-testid="roles"] li')
    expect(roles).toHaveLength(expected.length)
  })

  it('links the previous and next departments, wrapping around the ends', async () => {
    render(await DepartmentView(params(departments[0].slug)))
    const nav = screen.getByRole('navigation', { name: t('dept.siblings') })
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([`/departments/${departments[departments.length - 1].slug}`, `/departments/${departments[1].slug}`])
  })
})
