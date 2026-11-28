// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const outbox = vi.hoisted(() => ({ flushStale: vi.fn() }))
vi.mock('@/lib/email/outbox', () => outbox)
vi.mock('@/lib/monitoring/report', () => ({ reportError: vi.fn() }))

// serverEnv() checks the whole server environment, so the tests set a valid one.
const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  TOKEN_SECRET: 'local-test-secret-0123456789abcdef0123',
  EMAIL_TRANSPORT: 'smtp',
  SITE_URL: 'http://localhost:3000',
  CRON_SECRET: 'local-cron',
}

/** the route with a fresh serverEnv() that reads ENV */
async function load() {
  vi.resetModules()
  for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value)
  const { reportError } = await import('@/lib/monitoring/report')
  return { GET: (await import('@/app/api/cron/flush-email/route')).GET, reportError }
}

const call = (GET: (r: Request) => Promise<Response>, authorization?: string) =>
  GET(new Request('http://localhost:3000/api/cron/flush-email', { headers: authorization ? { authorization } : {} }))

beforeEach(() => {
  vi.clearAllMocks()
  outbox.flushStale.mockResolvedValue({ sent: 2, failed: 1 })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

/* dev-2 D2-8, spec §10.3 */
describe('GET /api/cron/flush-email', () => {
  it('answers 401 without the Authorization header, and sends nothing', async () => {
    const { GET } = await load()
    expect((await call(GET)).status).toBe(401)
    expect(outbox.flushStale).not.toHaveBeenCalled()
  })

  it('sends the stale emails for Bearer <CRON_SECRET> and returns the counts', async () => {
    const { GET } = await load()
    const response = await call(GET, 'Bearer local-cron')
    expect(response.status).toBe(200)
    expect(await response.json()).toStrictEqual({ sent: 2, failed: 1 })
    expect(outbox.flushStale).toHaveBeenCalledTimes(1)
  })

  /* Beyond the task's cases */
  // (a header's surrounding whitespace is trimmed by the Headers API itself, as over HTTP)
  it.each(['Bearer wrong', 'local-cron', 'bearer local-cron', 'Bearer  local-cron', 'Bearer local-cronx'])('answers 401 to %j', async (header) => {
    const { GET } = await load()
    expect((await call(GET, header)).status).toBe(401)
    expect(outbox.flushStale).not.toHaveBeenCalled()
  })

  it('reports a failure and answers 500', async () => {
    const { GET, reportError } = await load()
    const failure = new Error('database down')
    outbox.flushStale.mockRejectedValue(failure)
    expect((await call(GET, 'Bearer local-cron')).status).toBe(500)
    expect(reportError).toHaveBeenCalledWith(failure, { level: 'error', tags: { alert: 'cron' } })
  })
})
