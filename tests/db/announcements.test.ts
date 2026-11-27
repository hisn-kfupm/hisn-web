import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { pgAdmin } from './helpers'

vi.mock('server-only', () => ({}))

import { applyAnnouncementChoice } from '@/lib/profile/announcements'

/** a fresh address per test (the task's a@x.com), so parallel test files never share a row */
const used: string[] = []
const fresh = () => {
  const email = `a-${randomUUID()}@x.com`
  used.push(email)
  return email
}

async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const db = await pgAdmin()
  try {
    return (await db.query(sql, params)).rows as T[]
  } finally {
    await db.end()
  }
}

const unsubscribed = (email: string, source = 'link') => query('insert into email_unsubscribes (email, source) values ($1, $2)', [email, source])
const row = async (email: string) => (await query<{ email: string; source: string }>('select email, source from email_unsubscribes where email = $1', [email]))[0] ?? null

afterAll(async () => {
  await query('delete from email_unsubscribes where email = any($1)', [used])
})

/* dev-2 D2-6, spec §10.2: the profile checkbox and email_unsubscribes */
describe('applyAnnouncementChoice', () => {
  it('signup, yes: removes an earlier unsubscribe', async () => {
    const email = fresh()
    await unsubscribed(email)
    await applyAnnouncementChoice(email, true, 'signup')
    expect(await row(email)).toBeNull()
  })

  it('signup, no: leaves an earlier unsubscribe in place', async () => {
    const email = fresh()
    await unsubscribed(email)
    await applyAnnouncementChoice(email, false, 'signup')
    expect(await row(email)).toStrictEqual({ email, source: 'link' })
  })

  it('signup, no: writes nothing when there is no unsubscribe', async () => {
    const email = fresh()
    await applyAnnouncementChoice(email, false, 'signup')
    expect(await row(email)).toBeNull()
  })

  it('account, no: records an unsubscribe from the profile; account, yes: removes it', async () => {
    const email = fresh()
    await applyAnnouncementChoice(email, false, 'account')
    expect(await row(email)).toStrictEqual({ email, source: 'profile' })
    await applyAnnouncementChoice(email, true, 'account')
    expect(await row(email)).toBeNull()
  })

  it('normalizes the address first', async () => {
    const email = fresh()
    await unsubscribed(email)
    await applyAnnouncementChoice(`  ${email.toUpperCase()} `, true, 'signup')
    expect(await row(email)).toBeNull()
  })

  it('account, no, over an earlier unsubscribe: keeps its source', async () => {
    const email = fresh()
    await unsubscribed(email, 'complaint')
    await applyAnnouncementChoice(email, false, 'account')
    expect(await row(email)).toStrictEqual({ email, source: 'complaint' })
  })

  it('account, no, twice: still one row', async () => {
    const email = fresh()
    await applyAnnouncementChoice(email, false, 'account')
    await applyAnnouncementChoice(email, false, 'account')
    expect(await query('select 1 from email_unsubscribes where email = $1', [email])).toHaveLength(1)
  })
})
