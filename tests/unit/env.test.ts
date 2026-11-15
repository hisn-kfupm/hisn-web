import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  TOKEN_SECRET: 'local-test-secret-0123456789abcdef0123',
  EMAIL_TRANSPORT: 'smtp',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '54325',
  SITE_URL: 'http://localhost:3000',
  CRON_SECRET: 'local-cron',
}

describe('serverEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws naming TOKEN_SECRET when it is shorter than 32 characters', async () => {
    for (const [name, value] of Object.entries(VALID)) vi.stubEnv(name, value)
    vi.stubEnv('TOKEN_SECRET', 'short')
    const { serverEnv } = await import('@/lib/env')

    expect(() => serverEnv()).toThrow(/TOKEN_SECRET/)
  })
})
