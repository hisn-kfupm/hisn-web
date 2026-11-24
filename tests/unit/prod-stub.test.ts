import { afterEach, describe, expect, it } from 'vitest'
import { memoryClient, supabaseProdServer } from '@/lib/db/prod-stub'
import { STAND_IN_IDS, standInSeatsTaken } from '@/lib/events/stand-in'

/*
  The stand-in for A-2's supabaseProdServer (deleted when A-2 is on main): an in-memory client that
  answers the admin queries the way PostgREST would, so the admin list can be previewed.
*/
const rows = [
  { id: 1, kind: 'a', n: 3 },
  { id: 2, kind: 'b', n: 1 },
  { id: 3, kind: 'a', n: 2 },
]

describe('memoryClient', () => {
  it('selects columns, filters with eq and in, orders and ranges', async () => {
    const db = memoryClient({ t: rows })
    expect(await db.from('t').select('id')).toEqual({ data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null })
    expect((await db.from('t').select('id,n').eq('kind', 'a')).data).toEqual([{ id: 1, n: 3 }, { id: 3, n: 2 }])
    expect((await db.from('t').select('id').in('id', [2, 3])).data).toEqual([{ id: 2 }, { id: 3 }])
    expect((await db.from('t').select('id').order('n', { ascending: false })).data).toEqual([{ id: 1 }, { id: 3 }, { id: 2 }])
    expect((await db.from('t').select('id').order('id').range(1, 5)).data).toEqual([{ id: 2 }, { id: 3 }])
  })

  it('returns one row or null with maybeSingle, and an error for more than one', async () => {
    const db = memoryClient({ t: rows })
    expect(await db.from('t').select('n').eq('id', 2).maybeSingle()).toEqual({ data: { n: 1 }, error: null })
    expect(await db.from('t').select('n').eq('id', 9).maybeSingle()).toEqual({ data: null, error: null })
    expect((await db.from('t').select('n').eq('kind', 'a').maybeSingle()).error).not.toBeNull()
  })

  it('answers an unknown table with an error, like a missing relation', async () => {
    expect((await memoryClient({}).from('nope').select('id')).error).not.toBeNull()
  })
})

describe('supabaseProdServer (stand-in)', () => {
  afterEach(() => {
    delete process.env.DEMO_SIGNED_IN
  })

  it('has no admin profile unless the demo sign-in is on', async () => {
    const db = await supabaseProdServer()
    expect((await db.from('profiles').select('is_admin').eq('is_admin', true)).data).toEqual([])
    process.env.DEMO_SIGNED_IN = '1'
    const demo = await supabaseProdServer()
    expect((await demo.from('profiles').select('is_admin').eq('is_admin', true)).data).toEqual([{ is_admin: true }])
  })

  it('serves the stand-in events, drafts included, with registrations matching their taken seats', async () => {
    const db = await supabaseProdServer()
    const events = (await db.from('events').select('id,status')).data ?? []
    expect(events.map((e) => e.id)).toContain(STAND_IN_IDS.draft)
    const registered = (await db.from('registrations').select('event_id').eq('event_id', 9001).eq('status', 'registered')).data ?? []
    expect(registered).toHaveLength(standInSeatsTaken(9001) ?? 0)
  })
})
