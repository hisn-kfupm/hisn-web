// A-6: the seed (supabase/seed.sql), the seed ids (tests/fixtures/seed.ts) and the database test helpers
// (tests/db/helpers.ts). Runs against local Supabase after `npm run db:reset`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { SEED } from '@/tests/fixtures/seed'
import { addRegistration, anonClient, clientAs, createEvent, createUser, pgAdmin } from '@/tests/db/helpers'
import majors from '@/data/majors.json'

let db: pg.Client

beforeAll(async () => {
  db = await pgAdmin()
})

afterAll(async () => {
  await db?.end()
})

describe('seed and helpers', () => {
  it('lets the admin read a draft event, and hides it from anon', async () => {
    const asAdmin = await clientAs(SEED.admin).from('events').select('id').eq('id', SEED.events.draft)
    expect(asAdmin.error).toBeNull()
    expect(asAdmin.data).toHaveLength(1)

    const asAnon = await anonClient().from('events').select('id').eq('id', SEED.events.draft)
    expect(asAnon.error).toBeNull()
    expect(asAnon.data).toHaveLength(0)
  })

  it('fills event 102 with 10 registered and 3 waitlisted', async () => {
    const { rows } = await db.query(
      `select status, count(*)::int as n from registrations where event_id = $1 group by status`,
      [SEED.events.fullWithWaitlist],
    )
    const counts = Object.fromEntries(rows.map((r) => [r.status, r.n]))
    expect(counts).toEqual({ registered: 10, waitlisted: 3 })
  })

  it('creates events past the seed ids, and registrations on them', async () => {
    const eventId = await createEvent({ capacity: 1 })
    expect(eventId).toBeGreaterThan(1000)

    const user = await createUser()
    const registrationId = await addRegistration(user.id, eventId)
    expect(registrationId).toEqual(expect.any(Number))
  })

  it('seeds languages: user 4 is English, user 1 Arabic; event 101 has English text, event 103 none', async () => {
    const { rows: users } = await db.query(`select id, locale from profiles where id = any($1::uuid[])`, [
      [SEED.user(1).id, SEED.user(4).id],
    ])
    const locale = Object.fromEntries(users.map((r) => [r.id, r.locale]))
    expect(locale[SEED.user(4).id]).toBe('en')
    expect(locale[SEED.user(1).id]).toBe('ar')

    const { rows: events } = await db.query(`select id, title_en from events where id = any($1::bigint[])`, [
      [SEED.events.open, SEED.events.unlimited],
    ])
    const titleEn = Object.fromEntries(events.map((r) => [Number(r.id), r.title_en]))
    expect(titleEn[SEED.events.open]).toEqual(expect.any(String))
    expect(titleEn[SEED.events.unlimited]).toBeNull()
  })

  // owner decision for A-6: the admin takes the 28th major code, so every code in data/majors.json is used
  it('uses every major code in data/majors.json across the seeded profiles', async () => {
    const { rows } = await db.query(`select distinct major_code from profiles`)
    const used = new Set(rows.map((r) => r.major_code))
    expect(majors.map((m) => m.code).filter((code) => !used.has(code))).toEqual([])
  })
})
