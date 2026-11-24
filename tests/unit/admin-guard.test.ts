import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
  dev-1 D1-13: requireAdmin() (spec §7.11). getSession, the database client and next/navigation are
  mocked, so no database is needed. The client mock answers the one query the guard makes, the
  caller's own profile row, and records it.
*/
const state = vi.hoisted(() => ({
  session: null as { userId: string; email: string } | null,
  profile: { data: null, error: null } as { data: { is_admin: boolean } | null; error: { message: string } | null },
  queries: [] as string[],
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))
vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
// STAND-IN paths: D2-4 makes this '@/lib/auth/session', A-2 makes the next one '@/lib/db/prod'
vi.mock('@/lib/auth/session-stub', () => ({ getSession: vi.fn(async () => state.session) }))
vi.mock('@/lib/db/prod-stub', () => ({
  supabaseProdServer: vi.fn(async () => ({
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: async () => {
            state.queries.push(`${table}.${columns} where ${column}=${String(value)}`)
            return state.profile
          },
        }),
      }),
    }),
  })),
}))

import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { requireAdmin } from '@/lib/admin/require-admin'

beforeEach(() => {
  vi.mocked(redirect).mockClear()
  vi.mocked(connection).mockClear()
  state.session = null
  state.profile = { data: null, error: null }
  state.queries = []
})

describe('requireAdmin', () => {
  it('sends a signed-out visitor to sign in, coming back to /admin', async () => {
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/ar/sign-in?returnTo=/admin')
    expect(state.queries).toEqual([])
  })

  it('sends a signed-in non-admin to /ar', async () => {
    state.session = { userId: 'u2', email: 'b@kfupm.edu.sa' }
    state.profile = { data: { is_admin: false }, error: null }
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/ar')
  })

  it('sends a signed-in visitor without a profile row to /ar', async () => {
    state.session = { userId: 'u3', email: 'c@kfupm.edu.sa' }
    state.profile = { data: null, error: null }
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/ar')
  })

  it('lets an admin through with their user id, after reading their own profile', async () => {
    state.session = { userId: 'u1', email: 'a@kfupm.edu.sa' }
    state.profile = { data: { is_admin: true }, error: null }
    await expect(requireAdmin()).resolves.toEqual({ userId: 'u1' })
    expect(redirect).not.toHaveBeenCalled()
    expect(state.queries).toEqual(['profiles.is_admin where id=u1'])
  })

  it('denies access when the profile cannot be read (protection wins, P-1)', async () => {
    state.session = { userId: 'u1', email: 'a@kfupm.edu.sa' }
    state.profile = { data: null, error: { message: 'connection refused' } }
    await expect(requireAdmin()).rejects.toThrow()
    expect(redirect).not.toHaveBeenCalledWith('/admin')
  })

  it('runs per request, never in a prerender', async () => {
    state.session = { userId: 'u1', email: 'a@kfupm.edu.sa' }
    state.profile = { data: { is_admin: true }, error: null }
    await requireAdmin()
    expect(connection).toHaveBeenCalled()
  })
})
