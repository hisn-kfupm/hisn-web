// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { config, proxy } from '@/proxy'
import { departments } from '@/lib/data/labels'
import { STAND_IN_IDS } from '@/lib/events/stand-in'
import { isMissingPage, NOT_FOUND_PATH } from '@/lib/routing/missing'

/*
  Unknown department and event pages must answer 404, not 200 (Abdullah, 22 Nov). With Cache
  Components the page starts streaming its 200 shell before notFound() can run, so the check
  happens in the Proxy, before rendering (Next docs: streaming guide, "Status codes").
*/
const exists = async (id: number) => id === 9001

describe('isMissingPage', () => {
  it('flags an unknown department slug and lets the six through', async () => {
    expect(await isMissingPage('/departments/nope', exists)).toBe(true)
    for (const d of departments) expect(await isMissingPage(`/departments/${d.slug}`, exists)).toBe(false)
  })

  it('flags an unknown or non-numeric event id and lets a public event through', async () => {
    expect(await isMissingPage('/events/999999', exists)).toBe(true)
    expect(await isMissingPage('/events/abc', exists)).toBe(true)
    expect(await isMissingPage('/events/12a', exists)).toBe(true)
    expect(await isMissingPage('/events/9001', exists)).toBe(false)
  })

  it('reads the /ar and /en paths the pages move to as well', async () => {
    expect(await isMissingPage('/en/departments/nope', exists)).toBe(true)
    expect(await isMissingPage('/ar/events/999999', exists)).toBe(true)
    expect(await isMissingPage('/ar/events/9001', exists)).toBe(false)
    expect(await isMissingPage('/en/departments/cybersecurity', exists)).toBe(false)
  })

  it('leaves every other path alone', async () => {
    for (const p of ['/', '/events', '/library', '/departments', '/events/9001/extra', '/talent']) {
      expect(await isMissingPage(p, exists)).toBe(false)
    }
  })
})

describe('proxy', () => {
  const run = (path: string) => proxy(new NextRequest(`http://localhost${path}`))

  it('rewrites a missing page to the 404 page before it renders', async () => {
    for (const p of ['/departments/nope', '/events/999999', '/events/abc', `/events/${STAND_IN_IDS.draft}`]) {
      expect((await run(p)).headers.get('x-middleware-rewrite'), p).toBe(`http://localhost${NOT_FOUND_PATH}`)
    }
  })

  it('lets real pages through untouched, a cancelled event included', async () => {
    for (const p of ['/events/9001', `/events/${STAND_IN_IDS.cancelled}`, `/events/${STAND_IN_IDS.pastWithRecording}`, '/departments/sector-awareness']) {
      const res = await run(p)
      expect(res.headers.get('x-middleware-rewrite'), p).toBeNull()
      expect(res.headers.get('x-middleware-next'), p).toBe('1')
    }
  })

  it('runs only on the department and event pages', () => {
    expect(config.matcher).toEqual(['/departments/:slug', '/events/:id', '/:locale(ar|en)/departments/:slug', '/:locale(ar|en)/events/:id'])
  })
})
