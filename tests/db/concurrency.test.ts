// D2-9: the registration functions under real concurrent requests. Each one locks the event row first
// (select … for update), so two people can never both take the last seat. Runs against local Supabase after
// `npm run db:reset`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { addRegistration, clientAs, createEvent, createUser, pgAdmin } from '@/tests/db/helpers'

let db: pg.Client

beforeAll(async () => {
  db = await pgAdmin()
})

afterAll(async () => {
  await db?.end()
})

/** registered rows and queued confirmation emails for an event */
async function counts(eventId: number): Promise<{ registered: number; confirmations: number }> {
  const { rows } = await db.query<{ registered: number; confirmations: number }>(
    `select (select count(*)::int from registrations where event_id = $1 and status = 'registered') as registered,
            (select count(*)::int from email_deliveries where event_id = $1 and kind = 'confirmation' and status = 'queued') as confirmations`,
    [eventId],
  )
  return rows[0]
}

/** a connection with an open transaction, signed in as `userId`; without one it stays postgres (like the service key) */
async function openTransaction(userId?: string): Promise<pg.Client> {
  const client = await pgAdmin()
  await client.query('begin')
  if (userId) await client.query('select tests.login_as($1)', [userId])
  return client
}

async function closeAll(...clients: pg.Client[]): Promise<void> {
  await Promise.allSettled(clients.map((client) => client.query('rollback')))
  await Promise.allSettled(clients.map((client) => client.end()))
}

/** runs a query in the client's open transaction, then commits as soon as it answers (releasing its locks) */
async function runAndCommit<T extends pg.QueryResultRow>(client: pg.Client, sql: string, values: unknown[]): Promise<pg.QueryResult<T>> {
  const result = await client.query<T>(sql, values)
  await client.query('commit')
  return result
}

/** a query still running, and whether it has answered yet */
function watch<T>(query: Promise<T>): { result: Promise<T>; answered: () => boolean } {
  let answered = false
  const result = query.finally(() => {
    answered = true
  })
  result.catch(() => undefined) // a failure is reported where `result` is awaited, not as an unhandled rejection
  return { result, answered: () => answered }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('registration functions under concurrency', () => {
  it('gives the last seat to exactly one of two people who ask at the same moment, five times over', async () => {
    for (let round = 0; round < 5; round++) {
      const p_event_id = await createEvent({ capacity: 1 })
      const [u1, u2] = await Promise.all([createUser(), createUser()])

      const results = await Promise.all([
        clientAs(u1).rpc('register_for_event', { p_event_id }),
        clientAs(u2).rpc('register_for_event', { p_event_id }),
      ])

      expect(results.map((r) => r.error)).toEqual([null, null])
      expect(results.map((r) => r.data).sort()).toEqual(['full', 'registered'])
      expect(await counts(p_event_id)).toEqual({ registered: 1, confirmations: 1 })
    }
  })

  it('keeps one row and queues one email when the same person asks twice at the same moment', async () => {
    const p_event_id = await createEvent({ capacity: 5 })
    const user = await createUser()

    const results = await Promise.all([
      clientAs(user).rpc('register_for_event', { p_event_id }),
      clientAs(user).rpc('register_for_event', { p_event_id }),
    ])

    expect(results.map((r) => r.error)).toEqual([null, null])
    expect(results.map((r) => r.data).sort()).toEqual(['already_registered', 'registered'])
    expect(await counts(p_event_id)).toEqual({ registered: 1, confirmations: 1 })
  })

  // The races above can pass by luck. Here the first registration is held open in a transaction: the second request
  // has to wait for it, and once it commits, the second sees that seat taken.
  it('makes a second registration wait for the first to commit, then answers full', async () => {
    const eventId = await createEvent({ capacity: 1 })
    const [u1, u2] = await Promise.all([createUser(), createUser()])
    const first = await openTransaction(u1.id)
    const second = await openTransaction(u2.id)

    try {
      const a = await first.query<{ result: string }>('select public.register_for_event($1) as result', [eventId])
      expect(a.rows[0].result).toBe('registered')

      const b = watch(second.query<{ result: string }>('select public.register_for_event($1) as result', [eventId]))
      await pause(300)
      expect(b.answered()).toBe(false) // waiting for the event row lock

      await first.query('commit')
      expect((await b.result).rows[0].result).toBe('full')
      await second.query('commit')

      expect(await counts(eventId)).toEqual({ registered: 1, confirmations: 1 })
    } finally {
      await closeAll(first, second)
    }
  })

  // Cancelling frees a seat that promote_waitlist (D2-10) hands on, so both cancels must hold the event lock too.
  // The holder takes the row "for no key update", as an admin's event save does: that blocks "for update" but not the
  // foreign-key checks on email_deliveries.event_id, so only the functions' own lock can make them wait here.
  it('makes both cancels wait for the event row lock', async () => {
    const eventId = await createEvent({ capacity: 5 })
    const [own, linked] = await Promise.all([createUser(), createUser()])
    await addRegistration(own.id, eventId)
    const linkedRegistration = await addRegistration(linked.id, eventId)
    const holder = await openTransaction()
    const mine = await openTransaction(own.id)
    const byLink = await openTransaction()

    try {
      await holder.query('select 1 from events where id = $1 for no key update', [eventId])

      const cancelMine = watch(
        runAndCommit<{ result: string }>(mine, 'select public.cancel_my_registration($1) as result', [eventId]),
      )
      const cancelByLink = watch(
        runAndCommit<{ result: string }>(byLink, 'select public.cancel_registration_by_id($1, 1) as result', [
          linkedRegistration,
        ]),
      )
      await pause(300)
      expect([cancelMine.answered(), cancelByLink.answered()]).toEqual([false, false])

      await holder.query('commit')
      expect((await cancelMine.result).rows[0].result).toBe('cancelled')
      expect((await cancelByLink.result).rows[0].result).toBe('cancelled')
    } finally {
      await closeAll(holder, mine, byLink)
    }
  })
})
