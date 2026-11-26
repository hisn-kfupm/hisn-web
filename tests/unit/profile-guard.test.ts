// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const auth = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/session', () => auth)

/** a stand-in client that records the query and answers with `result` */
const db = vi.hoisted(() => {
  const state = {
    result: { data: null as unknown, error: null as unknown },
    calls: [] as unknown[][],
    clients: 0,
  }
  const query = {
    select: (...args: unknown[]) => (state.calls.push(['select', ...args]), query),
    eq: (...args: unknown[]) => (state.calls.push(['eq', ...args]), query),
    maybeSingle: async () => (state.calls.push(['maybeSingle']), state.result),
  }
  const client = { from: (table: string) => (state.calls.push(['from', table]), query) }
  return { state, client }
})
vi.mock('@/lib/db/prod', () => ({
  supabaseProdServer: async () => {
    db.state.clients++
    return db.client
  },
}))

import { hasProfile, withProfile } from '@/lib/profile/guard'

const signedIn = () => auth.getSession.mockResolvedValue({ userId: 'u1', email: 'a@x.com' })
const withRow = () => (db.state.result = { data: { id: 'u1' }, error: null })
const withoutRow = () => (db.state.result = { data: null, error: null })

beforeEach(() => {
  vi.clearAllMocks()
  db.state.calls = []
  db.state.clients = 0
  withoutRow()
})

/* dev-2 D2-7: the server side of the profile step (spec §7.2) */
describe('withProfile', () => {
  it('no profile: returns { needsProfile: true } without calling the action', async () => {
    signedIn()
    const action = vi.fn(async () => 'registered')
    expect(await withProfile(action)).toStrictEqual({ needsProfile: true })
    expect(action).not.toHaveBeenCalled()
  })

  it("a profile: returns the action's value, after calling it once", async () => {
    signedIn()
    withRow()
    const action = vi.fn(async () => ({ result: 'waitlisted', position: 3 }))
    expect(await withProfile(action)).toStrictEqual({ result: 'waitlisted', position: 3 })
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('no session: rejects with unauthenticated, before the action or any query', async () => {
    auth.getSession.mockResolvedValue(null)
    const action = vi.fn(async () => 'registered')
    await expect(withProfile(action)).rejects.toThrow('unauthenticated')
    expect(action).not.toHaveBeenCalled()
    expect(db.state.calls).toStrictEqual([])
  })

  it("looks for the signed-in person's own row", async () => {
    signedIn()
    withRow()
    await withProfile(async () => undefined)
    expect(db.state.calls).toContainEqual(['from', 'profiles'])
    expect(db.state.calls).toContainEqual(['eq', 'id', 'u1'])
  })

  it('a failed lookup rejects, and the action is not called (neither "no profile" nor "has one")', async () => {
    signedIn()
    db.state.result = { data: null, error: { code: 'PGRST000', message: 'down' } }
    const action = vi.fn(async () => 'registered')
    await expect(withProfile(action)).rejects.toMatchObject({ message: 'down' })
    expect(action).not.toHaveBeenCalled()
  })

  it("passes the action's own failure through", async () => {
    signedIn()
    withRow()
    await expect(withProfile(async () => Promise.reject(new Error('full')))).rejects.toThrow('full')
  })

  it('checks the profile before the action runs', async () => {
    signedIn()
    withRow()
    let queriedFirst = false
    await withProfile(async () => {
      queriedFirst = db.state.calls.some(([step]) => step === 'maybeSingle')
    })
    expect(queriedFirst).toBe(true)
  })
})

describe('hasProfile', () => {
  it('true with a profile row, false without', async () => {
    signedIn()
    withRow()
    expect(await hasProfile()).toBe(true)
    withoutRow()
    expect(await hasProfile()).toBe(false)
  })

  it('false when nobody is signed in, without a query', async () => {
    auth.getSession.mockResolvedValue(null)
    expect(await hasProfile()).toBe(false)
    expect(db.state.calls).toStrictEqual([])
  })

  it("looks for the signed-in person's own row", async () => {
    signedIn()
    await hasProfile()
    expect(db.state.calls).toContainEqual(['from', 'profiles'])
    expect(db.state.calls).toContainEqual(['eq', 'id', 'u1'])
  })

  it('a failed lookup rejects instead of answering', async () => {
    signedIn()
    db.state.result = { data: null, error: { code: 'PGRST000', message: 'down' } }
    await expect(hasProfile()).rejects.toMatchObject({ message: 'down' })
  })
})
