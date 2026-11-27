// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/lib/i18n/locale'

const auth = vi.hoisted(() => ({ getUser: vi.fn(), signOut: vi.fn() }))
vi.mock('@/lib/db/prod', () => ({ supabaseProdServer: async () => ({ auth }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { redirect } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth/session'

beforeEach(() => {
  vi.clearAllMocks()
  auth.signOut.mockResolvedValue({ error: null })
})

/* dev-2 D2-4. The mocked client has no auth.getSession(): the server reads the user with getUser(). */
describe('getSession', () => {
  it('returns the signed-in user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null })
    expect(await getSession()).toStrictEqual({ userId: 'u1', email: 'a@b.com' })
  })

  it('returns null when nobody is signed in', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getSession()).toBeNull()
  })
})

describe('signOut', () => {
  it('signs out once, then goes home in English from English', async () => {
    await signOut('en')
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('/en')
    expect(auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(redirect).mock.invocationCallOrder[0])
  })

  it('goes home in Arabic from Arabic', async () => {
    await signOut('ar')
    expect(redirect).toHaveBeenCalledWith('/ar')
  })

  it('goes to /ar for a locale that is not ours', async () => {
    await signOut('fr' as Locale)
    expect(redirect).toHaveBeenCalledWith('/ar')
  })

  // P-1: when revoking on the server fails, supabase-js keeps the session, so this device would stay signed in
  it('still signs this device out when the server cannot revoke the session', async () => {
    auth.signOut.mockResolvedValueOnce({ error: new Error('network down') })
    await signOut('en')
    expect(auth.signOut).toHaveBeenCalledTimes(2)
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(redirect).toHaveBeenCalledWith('/en')
  })
})
