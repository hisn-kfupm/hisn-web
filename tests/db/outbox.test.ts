import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { addRegistration, createEvent, createUser, pgAdmin } from './helpers'

vi.mock('server-only', () => ({}))
const send = vi.hoisted(() => ({ sendEmail: vi.fn(), sendBatch: vi.fn() }))
vi.mock('@/lib/email/send', () => send)
vi.mock('@/lib/monitoring/report', () => ({ reportError: vi.fn() }))

import { flushOutboxFor, flushQueuedForEvent, flushStale } from '@/lib/email/outbox'
import type { OutgoingEmail } from '@/lib/email/send'
import { reportError } from '@/lib/monitoring/report'

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await pgAdmin()
  try {
    return (await db.query(sql, params)).rows as T[]
  } finally {
    await db.end()
  }
}

const users: string[] = []
const events: number[] = []

async function newEvent(): Promise<number> {
  const id = await createEvent()
  events.push(id)
  return id
}

/**
 * A queued email_deliveries row about a new registration (a new user with a profile), created `age` ago and,
 * with `claimedAgo`, already claimed by another sender that long ago.
 */
async function queued(opts: { kind?: string; age?: string; eventId?: number; claimedAgo?: string } = {}) {
  const user = await createUser()
  users.push(user.id)
  const eventId = opts.eventId ?? (await newEvent())
  const kind = opts.kind ?? 'confirmation'
  const registrationId = await addRegistration(user.id, eventId, kind === 'waitlist_joined' ? 'waitlisted' : 'registered')
  const [row] = await query<{ id: string }>(
    `insert into email_deliveries (event_id, registration_id, kind, email, locale, created_at, attempted_at)
     values ($1, $2, $3, $4, 'ar', now() - $5::interval, now() - $6::interval) returning id`,
    [eventId, kind === 'announcement' ? null : registrationId, kind, user.email, opts.age ?? '3 minutes', opts.claimedAgo ?? null],
  )
  return { id: Number(row.id), email: user.email, eventId, registrationId }
}

type Status = { status: string; error: string | null; provider_message_id: string | null }
const stored = async (id: number) => (await query<Status>('select status, error, provider_message_id from email_deliveries where id = $1', [id]))[0]
/** how many emails went to this address (other suites' leftover rows may be sent too) */
const sentTo = (address: string) => send.sendEmail.mock.calls.filter(([m]) => (m as OutgoingEmail).to === address).length

beforeAll(async () => {
  // Rows other suites left queued long ago would otherwise be sent by the runs below, before these tests' rows:
  // a call sends at most 100, oldest first.
  send.sendEmail.mockResolvedValue({ id: 'drain' })
  for (let call = 0; call < 50; call++) {
    const { sent, failed } = await flushStale()
    if (sent + failed === 0) break
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  let n = 0
  send.sendEmail.mockImplementation(async () => ({ id: `msg-${++n}` }))
})

afterAll(async () => {
  await query('delete from email_deliveries where event_id = any($1)', [events])
  await query('delete from events where id = any($1)', [events])
  await query('delete from auth.users where id = any($1)', [users])
})

/* dev-2 D2-8, spec §10.3 */
describe('flushStale', () => {
  it('sends a queued confirmation older than 2 minutes, once, and marks it sent', async () => {
    const row = await queued({ age: '3 minutes' })
    await flushStale()
    expect(sentTo(row.email)).toBe(1)
    expect(await stored(row.id)).toMatchObject({ status: 'sent', error: null })
    expect((await stored(row.id)).provider_message_id).toMatch(/^msg-/)
  })

  it('leaves a row queued 1 minute ago', async () => {
    const row = await queued({ age: '1 minute' })
    await flushStale()
    expect(sentTo(row.email)).toBe(0)
    expect((await stored(row.id)).status).toBe('queued')
  })

  it('marks a row failed, with the error, when sending throws, and reports it', async () => {
    const row = await queued({ age: '3 minutes' })
    send.sendEmail.mockImplementation(async (m: OutgoingEmail) => {
      if (m.to === row.email) throw new Error('boom')
      return { id: 'other' }
    })
    await flushStale()
    const after = await stored(row.id)
    expect(after.status).toBe('failed')
    expect(after.error).toContain('boom')
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }), { level: 'error', tags: { kind: 'confirmation' } })
  })

  it('sends one stale row exactly once when two runs race', async () => {
    const row = await queued({ age: '3 minutes' })
    await Promise.all([flushStale(), flushStale()])
    expect(sentTo(row.email)).toBe(1)
    expect((await stored(row.id)).status).toBe('sent')
  })

  it('never sends an announcement (D2-14 sends those)', async () => {
    const row = await queued({ kind: 'announcement', age: '3 minutes' })
    await flushStale()
    expect(sentTo(row.email)).toBe(0)
    expect((await stored(row.id)).status).toBe('queued')
  })

  /* The rest of D2-8's rules */
  it('marks a row skipped when the allowlist holds it back', async () => {
    const row = await queued({ age: '3 minutes' })
    send.sendEmail.mockResolvedValue({ skipped: true })
    await flushStale()
    expect((await stored(row.id)).status).toBe('skipped')
  })

  it('keeps the first 500 characters of a long error', async () => {
    const row = await queued({ age: '3 minutes' })
    send.sendEmail.mockRejectedValue(new Error('x'.repeat(600)))
    await flushStale()
    expect((await stored(row.id)).error).toHaveLength(500)
  })

  // review of D2-8: a cut inside an emoji, or text Postgres can't store, made the status update fail, so the row
  // stayed queued and was sent again every 5 minutes
  it('records any error: cut at 500 characters, never inside one, and without text Postgres cannot store', async () => {
    const emoji = await queued({ age: '3 minutes' })
    const broken = await queued({ age: '3 minutes' })
    send.sendEmail.mockImplementation(async (m: OutgoingEmail) => {
      throw new Error(m.to === emoji.email ? 'a' + '😀'.repeat(600) : 'x\ud83d\u0000y')
    })
    await flushStale()
    const first = await stored(emoji.id)
    expect(first.status).toBe('failed')
    // 500 characters: the 'a' and 499 whole emoji (a cut at 500 UTF-16 units would have split the 250th)
    expect(first.error).toBe('a' + '😀'.repeat(499))
    expect(await stored(broken.id)).toMatchObject({ status: 'failed', error: 'x�y' })
  })

  it('leaves a row another sender claimed under 5 minutes ago, and takes over one claimed longer ago', async () => {
    const recent = await queued({ age: '10 minutes', claimedAgo: '1 minute' })
    const stuck = await queued({ age: '10 minutes', claimedAgo: '6 minutes' })
    await flushStale()
    expect(sentTo(recent.email)).toBe(0)
    expect((await stored(recent.id)).status).toBe('queued')
    expect(sentTo(stuck.email)).toBe(1)
    expect((await stored(stuck.id)).status).toBe('sent')
  })

  it('returns how many it sent and how many failed', async () => {
    const good = await queued({ age: '3 minutes' })
    const bad = await queued({ age: '3 minutes' })
    send.sendEmail.mockImplementation(async (m: OutgoingEmail) => {
      if (m.to === bad.email) throw new Error('boom')
      return { id: `msg-${good.id}` }
    })
    expect(await flushStale()).toStrictEqual({ sent: 1, failed: 1 })
  })
})

describe('flushQueuedForEvent', () => {
  it("sends event A's queued rows, however new, in order, and leaves event B's queued", async () => {
    const [a, b] = [await newEvent(), await newEvent()]
    const first = await queued({ eventId: a, age: '0 minutes' })
    const second = await queued({ eventId: a, kind: 'cancel_confirmation', age: '0 minutes' })
    const other = await queued({ eventId: b, age: '0 minutes' })
    await flushQueuedForEvent(a)
    expect(send.sendEmail.mock.calls.map(([m]) => (m as OutgoingEmail).to)).toStrictEqual([first.email, second.email])
    expect((await stored(first.id)).status).toBe('sent')
    expect((await stored(other.id)).status).toBe('queued')
  })

  it('sends confirmation, promoted, waitlist_joined and cancel_confirmation, and leaves the other kinds to D2-14', async () => {
    const event = await newEvent()
    const kinds = ['confirmation', 'promoted', 'waitlist_joined', 'cancel_confirmation', 'announcement', 'event_cancelled', 'event_changed']
    const rows = new Map<string, Awaited<ReturnType<typeof queued>>>()
    for (const kind of kinds) rows.set(kind, await queued({ eventId: event, kind, age: '0 minutes' }))
    await flushQueuedForEvent(event)
    for (const kind of kinds) {
      const sent = ['confirmation', 'promoted', 'waitlist_joined', 'cancel_confirmation'].includes(kind)
      expect(sentTo(rows.get(kind)!.email), kind).toBe(sent ? 1 : 0)
      expect((await stored(rows.get(kind)!.id)).status, kind).toBe(sent ? 'sent' : 'queued')
    }
  })
})

describe('flushOutboxFor', () => {
  it('sends the queued rows of the given registrations only', async () => {
    const one = await queued({ age: '0 minutes' })
    const two = await queued({ age: '0 minutes' })
    await flushOutboxFor([one.registrationId])
    expect(sentTo(one.email)).toBe(1)
    expect(sentTo(two.email)).toBe(0)
    expect((await stored(two.id)).status).toBe('queued')
  })

  it('does nothing for no registrations', async () => {
    await flushOutboxFor([])
    expect(send.sendEmail).not.toHaveBeenCalled()
  })
})
