// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// serverEnv() checks the whole server environment, so the tests set a valid one, with SITE_URL as the task says.
const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  TOKEN_SECRET: 'local-test-secret-0123456789abcdef0123',
  EMAIL_TRANSPORT: 'smtp',
  SITE_URL: 'https://x.test',
  CRON_SECRET: 'local-cron',
}

/** Fresh modules that read this environment (serverEnv() caches what it reads first). */
async function load(env: Partial<typeof ENV> = {}) {
  vi.resetModules()
  for (const [name, value] of Object.entries({ ...ENV, ...env })) vi.stubEnv(name, value)
  const [{ unsubscribeHeaders }, { verifyToken }] = await Promise.all([import('@/lib/email/headers'), import('@/lib/tokens/sign')])
  return { unsubscribeHeaders, verifyToken }
}

/** the t= query parameter of a <…> header value */
const tokenIn = (header: string) => new URL(header.slice(1, -1)).searchParams.get('t')

afterEach(() => {
  vi.unstubAllEnvs()
})

/* dev-2 D2-2, spec §10.4 */
describe('unsubscribeHeaders', () => {
  it('points List-Unsubscribe at the one-click endpoint, with no language in the path', async () => {
    const { unsubscribeHeaders } = await load()
    const header = unsubscribeHeaders('A@B.com')['List-Unsubscribe']
    expect(header).toMatch(/^<https:\/\/x\.test\/api\/unsubscribe\?t=[^>]+>$/)
    expect(header).not.toMatch(/\/(ar|en)\//)
  })

  it('carries an unsubscribe token for the normalized address', async () => {
    const { unsubscribeHeaders, verifyToken } = await load()
    expect(verifyToken(tokenIn(unsubscribeHeaders('A@B.com')['List-Unsubscribe'])!, 'unsub')).toStrictEqual({ sub: 'a@b.com' })
  })

  it('asks mail clients for a one-click POST (RFC 8058)', async () => {
    const { unsubscribeHeaders } = await load()
    expect(unsubscribeHeaders('A@B.com')['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  /* Beyond the task's cases */
  it('returns exactly the two headers', async () => {
    const { unsubscribeHeaders } = await load()
    expect(Object.keys(unsubscribeHeaders('A@B.com')).sort()).toStrictEqual(['List-Unsubscribe', 'List-Unsubscribe-Post'])
  })

  it('writes no double slash when SITE_URL ends with one', async () => {
    const { unsubscribeHeaders } = await load({ SITE_URL: 'https://x.test/' })
    expect(unsubscribeHeaders('A@B.com')['List-Unsubscribe']).toMatch(/^<https:\/\/x\.test\/api\/unsubscribe\?t=[^>]+>$/)
  })

  it('normalizes before signing: two spellings of one address get the same token', async () => {
    const { unsubscribeHeaders } = await load()
    expect(unsubscribeHeaders(' A@B.com ')['List-Unsubscribe']).toBe(unsubscribeHeaders('a@b.com')['List-Unsubscribe'])
  })
})
