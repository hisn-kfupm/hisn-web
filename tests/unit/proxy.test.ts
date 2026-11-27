// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

type Cookie = { name: string; value: string; options?: object }
type CookieMethods = { getAll: () => Cookie[]; setAll: (cookies: Cookie[], headers: Record<string, string>) => void }

const ssr = vi.hoisted(() => ({ createServerClient: vi.fn(), getClaims: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: ssr.createServerClient }))

import { config, proxy } from '@/proxy'
import nextConfig from '@/next.config'
import { departments } from '@/lib/data/labels'
import { NOT_FOUND_PATH } from '@/lib/routing/missing'

beforeEach(() => {
  vi.clearAllMocks()
  ssr.getClaims.mockResolvedValue({ data: null, error: null })
  ssr.createServerClient.mockImplementation(() => ({ auth: { getClaims: ssr.getClaims } }))
})

const run = (path: string, init?: { headers?: Record<string, string> }) => proxy(new NextRequest(`http://localhost${path}`, init))
const location = (res: Response) => res.headers.get('location')
/** the cookie methods proxy.ts handed to createServerClient */
const cookieMethods = () => ssr.createServerClient.mock.calls[0][2].cookies as CookieMethods

/* dev-2 D2-4: one locale redirect for every unprefixed path, in proxy.ts only */
describe('locale redirect', () => {
  it('sends / to /ar', async () => {
    const res = await run('/')
    expect([307, 308]).toContain(res.status)
    expect(location(res)).toMatch(/\/ar$/)
  })

  it('sends an unprefixed page to its Arabic address, with its query', async () => {
    expect(location(await run('/events'))).toMatch(/\/ar\/events$/)
    expect(location(await run('/events?m=2026-12'))).toMatch(/\/ar\/events\?m=2026-12$/)
    // a first segment that only starts with "ar" is not a locale
    expect(location(await run('/arabic'))).toMatch(/\/ar\/arabic$/)
  })

  it('lets locale, admin, API and static-file paths through', async () => {
    for (const p of ['/ar/events', '/en/events', '/admin', '/admin/events/3', '/api/unsubscribe?t=x', '/robots.txt']) {
      const res = await run(p)
      expect(location(res), p).toBeNull()
      expect(res.headers.get('x-middleware-next'), p).toBe('1')
    }
  })
})

describe("PR #9's temporary redirects", () => {
  it('are gone from next.config', async () => {
    expect((await nextConfig.redirects?.()) ?? []).toEqual([])
  })

  it('are not missed: a former bridge path still reaches Arabic through the proxy', async () => {
    expect(location(await run('/library?x=1'))).toMatch(/\/ar\/library\?x=1$/)
  })
})

describe("PR #8's 404 after the redirect", () => {
  it('redirects an unprefixed missing page first', async () => {
    expect(location(await run('/departments/nope'))).toMatch(/\/ar\/departments\/nope$/)
  })

  it('rewrites a missing page under a locale to the 404 page', async () => {
    for (const p of ['/ar/departments/nope', '/en/events/999999']) {
      expect((await run(p)).headers.get('x-middleware-rewrite'), p).toBe(`http://localhost${NOT_FOUND_PATH}`)
    }
  })

  it('leaves a real department page alone', async () => {
    const res = await run(`/ar/departments/${departments[0].slug}`)
    expect(location(res)).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })
})

/* The @supabase/ssr refresh: on every request that passes through, and only on those */
describe('session cookie refresh', () => {
  it('reads the request cookies and refreshes the session', async () => {
    await run('/ar/events', { headers: { cookie: 'sb-local-auth-token=old' } })
    expect(ssr.createServerClient).toHaveBeenCalledTimes(1)
    expect(ssr.getClaims).toHaveBeenCalledTimes(1)
    expect(cookieMethods().getAll()).toContainEqual(expect.objectContaining({ name: 'sb-local-auth-token', value: 'old' }))
  })

  it('writes refreshed cookies to the page and the browser, with the no-store headers', async () => {
    const noStore = { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache' }
    ssr.getClaims.mockImplementation(async () => {
      cookieMethods().setAll([{ name: 'sb-local-auth-token', value: 'fresh', options: { path: '/' } }], noStore)
      return { data: null, error: null }
    })
    const res = await run('/ar/events', { headers: { cookie: 'sb-local-auth-token=old' } })

    expect(res.headers.get('x-middleware-next')).toBe('1')
    // the browser gets the new token; a CDN must never cache a response that sets one
    expect(res.cookies.get('sb-local-auth-token')?.value).toBe('fresh')
    expect(res.headers.get('cache-control')).toBe(noStore['Cache-Control'])
    expect(res.headers.get('expires')).toBe('0')
    expect(res.headers.get('pragma')).toBe('no-cache')
    // server components in this same request read the new token
    expect(res.headers.get('x-middleware-request-cookie')).toContain('sb-local-auth-token=fresh')
  })

  it('creates no client for a redirect or a 404 rewrite', async () => {
    await run('/events')
    await run('/ar/departments/nope')
    expect(ssr.createServerClient).not.toHaveBeenCalled()
  })
})

describe('matcher', () => {
  const matches = (path: string) => unstable_doesMiddlewareMatch({ config, url: `http://localhost${path}` })

  it('runs on pages, admin, API routes and public files', () => {
    for (const p of ['/', '/events', '/ar/events/3', '/en', '/admin', '/api/unsubscribe', '/robots.txt']) {
      expect(matches(p), p).toBe(true)
    }
  })

  it('skips Next assets, the favicon and the cron routes', () => {
    for (const p of ['/_next/static/chunks/app.js', '/_next/image?url=%2Fa.jpg&w=64&q=75', '/favicon.ico', '/api/cron/flush-email']) {
      expect(matches(p), p).toBe(false)
    }
  })
})
