// A-9: the one-time copy of the teaser's signups into hisn-prod, run on launch day right before the domain switch
// (docs/runbooks/A-09-teaser-migration.md). The runbook loads the old rows into the temp table teaser_signups and
// runs scripts/launch/teaser-signups.sql in the same transaction; here fake rows stand in for them and every test
// rolls back. Runs against local Supabase after `npm run db:reset`.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { pgAdmin } from '@/tests/db/helpers'

const SQL = readFileSync('scripts/launch/teaser-signups.sql', 'utf8')

type Summary = { total: number; malformed: number; duplicates: number; unique_valid: number; inserted: number; already_in_prod: number }

let db: pg.Client

beforeEach(async () => {
  db = await pgAdmin()
  await db.query('begin')
  await db.query('create temp table teaser_signups (email text, created_at timestamptz) on commit drop')
})

afterEach(async () => {
  await db.query('rollback')
  await db.end()
})

async function load(rows: [string | null, string][], expected = rows.length): Promise<void> {
  for (const [email, at] of rows) await db.query('insert into teaser_signups values ($1, $2)', [email, at])
  await db.query("select set_config('teaser.expected_rows', $1, true)", [String(expected)])
}

/** runs the file; returns the malformed list (second to last result) and the summary (last result) */
async function run(): Promise<{ malformed: (string | null)[]; summary: Summary }> {
  const results = (await db.query(SQL)) as unknown as pg.QueryResult[]
  const list = Array.isArray(results) ? results : [results]
  const summary = list[list.length - 1].rows[0] as Summary
  const malformed = list[list.length - 2].rows.map((r: { email: string | null }) => r.email)
  return { malformed, summary }
}

async function signup(email: string) {
  const { rows } = await db.query<{ email: string; source: string; locale: string; created_at: Date }>(
    'select email, source, locale, created_at from signups where lower(trim(email)) = $1',
    [email],
  )
  return rows
}

const SAMPLE: [string | null, string][] = [
  [' Alice@Example.com ', '2025-03-02T10:00:00Z'],
  ['alice@example.com', '2025-03-01T09:00:00Z'], // the same person, earlier: this time is kept
  ['BOB@example.org', '2025-04-01T12:00:00Z'],
  ['not-an-email', '2025-04-02T12:00:00Z'],
  ['x@y', '2025-04-03T12:00:00Z'], // no top-level domain: newsletter_signup rejects it too
  [null, '2025-04-04T12:00:00Z'],
  ['S01@signup.test', '2025-01-01T00:00:00Z'], // already in hisn-prod (seed, footer)
]

describe('teaser-signups.sql', () => {
  it('copies valid addresses normalized, once each, with source import, locale ar and the earliest original time', async () => {
    await load(SAMPLE)
    const { summary } = await run()
    expect(summary).toEqual({ total: 7, malformed: 3, duplicates: 1, unique_valid: 3, inserted: 2, already_in_prod: 1 })

    const [alice] = await signup('alice@example.com')
    expect(alice).toMatchObject({ email: 'alice@example.com', source: 'import', locale: 'ar' })
    expect(alice.created_at.toISOString()).toBe('2025-03-01T09:00:00.000Z')
    expect(await signup('bob@example.org')).toMatchObject([{ email: 'bob@example.org', source: 'import' }])
  })

  it('drops malformed addresses, never stores them, and lists them for the owner', async () => {
    await load(SAMPLE)
    const { malformed } = await run()
    expect(malformed).toEqual(['not-an-email', 'x@y', null])
    expect(await signup('not-an-email')).toEqual([])
    expect(await signup('x@y')).toEqual([])
  })

  it('leaves an address that is already in hisn-prod as it is', async () => {
    await load(SAMPLE)
    await run()
    expect(await signup('s01@signup.test')).toMatchObject([{ email: 's01@signup.test', source: 'footer' }])
  })

  it('fails, and so the transaction rolls back, when the loaded rows are not the count taken from the old project', async () => {
    await load(SAMPLE, 8)
    await expect(run()).rejects.toThrow(/expected 8 rows from the old project, loaded 7/)
  })

  it('refuses to run without the expected count', async () => {
    await db.query("insert into teaser_signups values ('a@example.com', now())")
    await expect(run()).rejects.toThrow(/teaser\.expected_rows/)
  })

  it('is safe to run twice: the second run inserts nothing', async () => {
    await load(SAMPLE)
    await run()
    const { summary } = await run()
    expect(summary).toMatchObject({ unique_valid: 3, inserted: 0, already_in_prod: 3 })
  })
})
