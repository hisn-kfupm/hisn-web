import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { pgAdmin } from './helpers'

vi.mock('server-only', () => ({}))

const as = vi.hoisted(() => ({ user: null as { id: string; email: string } | null, failUnsubscribes: false }))
// The action runs as this test's user: their own client, so row-level security applies, and their session.
vi.mock('@/lib/db/prod', async (original) => {
  const { clientAs } = await import('./helpers')
  const real = await original<typeof import('@/lib/db/prod')>()
  return {
    ...real,
    supabaseProdServer: async () => clientAs(as.user!),
    // as.failUnsubscribes makes every write to email_unsubscribes fail, as an outage would
    supabaseProdService: () => {
      const client = real.supabaseProdService()
      if (!as.failUnsubscribes) return client
      const from = client.from.bind(client)
      const failed = { data: null, error: { message: 'injected failure', code: '57014' } }
      client.from = ((table: string) =>
        table === 'email_unsubscribes' ? { delete: () => ({ eq: async () => failed }), upsert: async () => failed } : from(table)) as typeof client.from
      return client
    },
  }
})
vi.mock('@/lib/auth/session', () => ({ getSession: async () => as.user && { userId: as.user.id, email: as.user.email } }))
vi.mock('@/lib/monitoring/report', () => ({ reportError: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { saveProfile } from '@/app/account/actions'
import { reportError } from '@/lib/monitoring/report'
import type { ProfileInput } from '@/lib/profile/schema'

const input: ProfileInput = {
  full_name_ar: 'سارة أحمد',
  major_code: 'SWE',
  academic_level_code: 'BACHELOR',
  gender: 'female',
  announcements_opt_in: false,
  locale: 'ar',
}

async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const db = await pgAdmin()
  try {
    return (await db.query(sql, params)).rows as T[]
  } finally {
    await db.end()
  }
}

type Row = { email: string; full_name_ar: string; is_admin: boolean; locale: string; announcements_opt_in: boolean; announcements_updated_at: Date }
const profile = async (id: string) =>
  (await query<Row>('select email, full_name_ar, is_admin, locale, announcements_opt_in, announcements_updated_at from profiles where id = $1', [id]))[0] ?? null
/** the sign-in code email's language (A-19 reads it) */
const metadataLocale = async (id: string) => (await query<{ locale: string | null }>("select raw_user_meta_data->>'locale' as locale from auth.users where id = $1", [id]))[0].locale
const unsubscribe = async (email: string) => (await query<{ source: string }>('select source from email_unsubscribes where email = $1', [email]))[0] ?? null

/*
  New users come from the Auth admin API, as real sign-ups do: tests.create_user (A-4) writes
  auth.users rows without instance_id, which the admin API can't find, and saveProfile mirrors the
  email language through that API.
*/
const authAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }).auth.admin
async function newUser(): Promise<{ id: string; email: string }> {
  const email = `user-${randomUUID()}@test.local`
  const { data, error } = await authAdmin().createUser({ email, email_confirm: true })
  if (error) throw error
  return { id: data.user.id, email }
}

const users: { id: string; email: string }[] = []
let user: { id: string; email: string }

beforeEach(async () => {
  vi.clearAllMocks()
  as.failUnsubscribes = false
  user = await newUser()
  users.push(user)
  as.user = user
})

afterAll(async () => {
  await query('delete from email_unsubscribes where email = any($1)', [users.map((u) => u.email)])
  for (const { id } of users) await authAdmin().deleteUser(id)
})

/* dev-2 D2-6, as a new user */
describe('saveProfile', () => {
  it('inserts the profile on the first save, with the session email, never as admin', async () => {
    expect(await saveProfile(input)).toStrictEqual({ ok: true })
    const row = await profile(user.id)
    expect(row.email).toBe(user.email)
    expect(row.is_admin).toBe(false)
  })

  it('updates it on a later save and keeps the email', async () => {
    await saveProfile(input)
    expect(await saveProfile({ ...input, full_name_ar: 'سارة محمد' })).toStrictEqual({ ok: true })
    const row = await profile(user.id)
    expect(row.full_name_ar).toBe('سارة محمد')
    expect(row.email).toBe(user.email)
  })

  it('never stores is_admin from the input (HR-4), on insert or update', async () => {
    await saveProfile({ ...input, is_admin: true } as ProfileInput)
    expect((await profile(user.id)).is_admin).toBe(false)
    await saveProfile({ ...input, is_admin: true } as ProfileInput)
    expect((await profile(user.id)).is_admin).toBe(false)
  })

  it('sets the email language on the first save, in profiles and in the sign-in email', async () => {
    await saveProfile({ ...input, locale: 'en' })
    expect((await profile(user.id)).locale).toBe('en')
    expect(await metadataLocale(user.id)).toBe('en')
  })

  it('changes both when the language changes later', async () => {
    await saveProfile({ ...input, locale: 'en' })
    await saveProfile({ ...input, locale: 'ar' })
    expect((await profile(user.id)).locale).toBe('ar')
    expect(await metadataLocale(user.id)).toBe('ar')
  })

  it('leaves the language alone when only the name changes', async () => {
    await saveProfile({ ...input, locale: 'en' })
    await saveProfile({ ...input, locale: 'en', full_name_ar: 'سارة محمد' })
    expect((await profile(user.id)).locale).toBe('en')
    expect(await metadataLocale(user.id)).toBe('en')
  })

  /* The rest of D2-6's interface */
  it('needs a session, before anything else', async () => {
    as.user = null
    await expect(saveProfile(input)).rejects.toThrow('unauthenticated')
    await expect(saveProfile({ ...input, major_code: 'OTHER' })).rejects.toThrow('unauthenticated')
  })

  it('returns field errors and writes nothing for bad input', async () => {
    expect(await saveProfile({ ...input, major_code: 'OTHER' })).toStrictEqual({ ok: false, errors: { major_other: 'profile.error.majorOther' } })
    expect(await profile(user.id)).toBeNull()
  })

  it('first save with yes clears an earlier unsubscribe (signup)', async () => {
    await query("insert into email_unsubscribes (email, source) values ($1, 'link')", [user.email])
    await saveProfile({ ...input, announcements_opt_in: true })
    expect(await unsubscribe(user.email)).toBeNull()
  })

  it('first save with no keeps an earlier unsubscribe (signup)', async () => {
    await query("insert into email_unsubscribes (email, source) values ($1, 'link')", [user.email])
    await saveProfile({ ...input, announcements_opt_in: false })
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'link' })
  })

  it('unticking later records an unsubscribe from the profile and dates the change (account)', async () => {
    await saveProfile({ ...input, announcements_opt_in: true })
    const before = (await profile(user.id)).announcements_updated_at
    await saveProfile({ ...input, announcements_opt_in: false })
    const row = await profile(user.id)
    expect(row.announcements_opt_in).toBe(false)
    expect(row.announcements_updated_at.getTime()).toBeGreaterThan(before.getTime())
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'profile' })
  })

  // every later save at no records the unsubscribe (review of #22), so one that failed is recorded by the next save
  it('a later save that keeps no leaves its date alone and records an unsubscribe from the profile', async () => {
    await saveProfile({ ...input, announcements_opt_in: false })
    const before = (await profile(user.id)).announcements_updated_at
    await saveProfile({ ...input, announcements_opt_in: false, full_name_ar: 'سارة محمد' })
    expect((await profile(user.id)).announcements_updated_at).toStrictEqual(before)
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'profile' })
  })

  it('keeps the source of an earlier unsubscribe when the box is unticked', async () => {
    await saveProfile({ ...input, announcements_opt_in: true })
    await query("insert into email_unsubscribes (email, source) values ($1, 'bounce')", [user.email])
    await saveProfile({ ...input, announcements_opt_in: false })
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'bounce' })
  })

  /* A write that fails part-way: the person never gets more than they asked for, and a retry finishes the job */
  it('first save with yes: a failed unsubscribe write stores nothing, and the retry completes', async () => {
    await query("insert into email_unsubscribes (email, source) values ($1, 'link')", [user.email])
    as.failUnsubscribes = true
    await expect(saveProfile({ ...input, announcements_opt_in: true, locale: 'en' })).rejects.toBeTruthy()
    expect(reportError).toHaveBeenCalled()
    expect(await profile(user.id)).toBeNull()

    as.failUnsubscribes = false
    expect(await saveProfile({ ...input, announcements_opt_in: true, locale: 'en' })).toStrictEqual({ ok: true })
    expect(await unsubscribe(user.email)).toBeNull()
    expect(await metadataLocale(user.id)).toBe('en')
  })

  it('ticking later: a failed unsubscribe removal keeps the profile at no, and the retry completes', async () => {
    await saveProfile({ ...input, announcements_opt_in: false })
    await query("insert into email_unsubscribes (email, source) values ($1, 'link')", [user.email])
    as.failUnsubscribes = true
    await expect(saveProfile({ ...input, announcements_opt_in: true })).rejects.toBeTruthy()
    expect((await profile(user.id)).announcements_opt_in).toBe(false)

    as.failUnsubscribes = false
    await saveProfile({ ...input, announcements_opt_in: true })
    expect((await profile(user.id)).announcements_opt_in).toBe(true)
    expect(await unsubscribe(user.email)).toBeNull()
  })

  it('unticking later: the opt-out holds even when recording the unsubscribe fails, and the next save records it', async () => {
    await saveProfile({ ...input, announcements_opt_in: true })
    as.failUnsubscribes = true
    await expect(saveProfile({ ...input, announcements_opt_in: false })).rejects.toBeTruthy()
    expect(reportError).toHaveBeenCalled()
    expect((await profile(user.id)).announcements_opt_in).toBe(false)

    // the stored choice already says no, so this save changes nothing about it; it still records the unsubscribe
    as.failUnsubscribes = false
    expect(await saveProfile({ ...input, announcements_opt_in: false })).toStrictEqual({ ok: true })
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'profile' })
  })

  // the row at no already stops announcements, so a save that keeps no isn't failed by the unsubscribe (review of #22)
  it('a later save that keeps no succeeds when recording the unsubscribe fails, and the next save records it', async () => {
    await saveProfile({ ...input, announcements_opt_in: false, locale: 'ar' })
    vi.clearAllMocks()
    as.failUnsubscribes = true
    expect(await saveProfile({ ...input, announcements_opt_in: false, locale: 'en' })).toStrictEqual({ ok: true })
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'injected failure' }), { level: 'error' })
    expect((await profile(user.id)).locale).toBe('en')
    expect(await metadataLocale(user.id)).toBe('en')
    expect(revalidatePath).toHaveBeenCalledWith('/en/account')
    expect(await unsubscribe(user.email)).toBeNull()

    as.failUnsubscribes = false
    expect(await saveProfile({ ...input, announcements_opt_in: false, locale: 'en' })).toStrictEqual({ ok: true })
    expect(await unsubscribe(user.email)).toStrictEqual({ source: 'profile' })
  })

  // Review Focus 3: a double tap on a slow connection
  it('two first saves at once both succeed, with one row', async () => {
    const results = await Promise.allSettled([saveProfile(input), saveProfile(input)])
    expect(results.map((result) => result.status)).toStrictEqual(['fulfilled', 'fulfilled'])
    expect((await query('select 1 from profiles where id = $1', [user.id])).length).toBe(1)
  })

  it('answers odd input with field errors, never a database error', async () => {
    expect(await saveProfile(null as never)).toStrictEqual({ ok: false, errors: { form: 'profile.error.invalid' } })
    expect(await saveProfile({ ...input, major_code: 'OTHER', major_other: '😀' })).toStrictEqual({ ok: false, errors: { major_other: 'profile.error.majorOther' } })
    expect(await saveProfile({ ...input, full_name_ar: 'سا\u0000رة' })).toStrictEqual({ ok: false, errors: { full_name_ar: 'profile.error.name' } })
    // one character outside the BMP: two UTF-16 code units, but one character for the table's check
    expect(await saveProfile({ ...input, full_name_ar: '𠀀' })).toStrictEqual({ ok: false, errors: { full_name_ar: 'profile.error.name' } })
    expect(await profile(user.id)).toBeNull()
  })

  it('refreshes both account pages', async () => {
    await saveProfile(input)
    expect(revalidatePath).toHaveBeenCalledWith('/ar/account')
    expect(revalidatePath).toHaveBeenCalledWith('/en/account')
  })
})
