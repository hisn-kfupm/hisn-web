import { afterEach, describe, expect, it, vi } from 'vitest'

/*
  dev-1 D1-13, Abdulaziz's review of #11: DEMO_SIGNED_IN=1 signs every visitor in as the demo user,
  whom the database stand-in makes an admin. It is for local previews only, so in production it
  must throw rather than open /admin to everyone (P-1). The real stand-ins run here; only
  next/navigation's redirect and next/server's connection() are mocked.
*/
vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { DEMO_SESSION, demoSignedIn, getSession } from '@/lib/auth/session-stub'
import { supabaseProdServer } from '@/lib/db/prod-stub'
import { requireAdmin } from '@/lib/admin/require-admin'

afterEach(() => {
  vi.unstubAllEnvs()
})

const demo = (nodeEnv: string) => {
  vi.stubEnv('DEMO_SIGNED_IN', '1')
  vi.stubEnv('NODE_ENV', nodeEnv)
}

describe('DEMO_SIGNED_IN', () => {
  it('is off unless set to 1', async () => {
    vi.stubEnv('DEMO_SIGNED_IN', '')
    expect(demoSignedIn()).toBe(false)
    expect(await getSession()).toBeNull()
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT /ar/sign-in?returnTo=/admin')
  })

  it('outside production, signs every visitor in as the demo admin, for local previews', async () => {
    demo('development')
    expect(await getSession()).toEqual(DEMO_SESSION)
    const db = await supabaseProdServer()
    expect((await db.from('profiles').select('is_admin').eq('id', DEMO_SESSION.userId).maybeSingle()).data).toEqual({ is_admin: true })
    await expect(requireAdmin()).resolves.toEqual({ userId: DEMO_SESSION.userId })
  })

  it('in production, throws instead of making every visitor an admin', async () => {
    demo('production')
    expect(() => demoSignedIn()).toThrow(/DEMO_SIGNED_IN/)
    await expect(getSession()).rejects.toThrow(/DEMO_SIGNED_IN/)
    await expect(supabaseProdServer()).rejects.toThrow(/DEMO_SIGNED_IN/)
    await expect(requireAdmin()).rejects.toThrow(/DEMO_SIGNED_IN/)
  })

  it('in production without it, everyone stays signed out', async () => {
    vi.stubEnv('DEMO_SIGNED_IN', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(await getSession()).toBeNull()
    const db = await supabaseProdServer()
    expect((await db.from('profiles').select('is_admin')).data).toEqual([])
  })
})
