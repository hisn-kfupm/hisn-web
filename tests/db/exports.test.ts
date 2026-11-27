// A-14: the admin CSV exports, run against local Supabase (`supabase start`, then `npm run db:reset`).
// The route reads with the caller's own session, so the admin policies (A-4) decide what it sees. Here
// supabaseProdServer() is swapped for a client signed in through the API as the user under test, and
// getSession() (which needs the cookie session) returns that same user.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type pg from 'pg'
import { addRegistration, anonClient, clientAs, createEvent, createUser, pgAdmin } from '@/tests/db/helpers'
import { SEED } from '@/tests/fixtures/seed'
import { riyadhDateKey } from '@/lib/time/riyadh'

type User = { id: string; email: string }

const session = vi.hoisted(() => ({ client: null as SupabaseClient | null, user: null as { id: string; email: string } | null }))

vi.mock('@/lib/db/prod', () => ({
  supabaseProdServer: async () => {
    if (!session.client) throw new Error('test: no client set')
    return session.client
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: async () => (session.user ? { userId: session.user.id, email: session.user.email } : null),
}))

const { GET } = await import('@/app/admin/export/[kind]/route')

const BOM = '﻿'

/** GET as `as` (a seeded or created user), or signed out with `null` */
async function get(kind: string, query = '', as: User | null = SEED.admin): Promise<Response> {
  session.user = as
  session.client = as ? clientAs(as) : anonClient()
  return GET(new Request(`http://localhost/admin/export/${kind}${query}`), { params: Promise.resolve({ kind }) })
}

/** RFC 4180: quoted fields may hold commas, doubled quotes and line breaks; records end with CRLF */
function parseCsv(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      record.push(field)
      field = ''
    } else if (c === '\r' && text[i + 1] === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
      i++
    } else field += c
  }
  record.push(field)
  records.push(record)
  return records
}

/**
 * The CSV as objects keyed by its (Arabic) header line. Reads the raw bytes: res.text() would drop
 * the byte order mark (UTF-8 decoding strips it), so it couldn't show the file starts with EF BB BF.
 */
async function table(res: Response): Promise<{ header: string[]; rows: Record<string, string>[] }> {
  const bytes = new Uint8Array(await res.arrayBuffer())
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  expect(text.startsWith(BOM)).toBe(true)
  const [header, ...lines] = parseCsv(text.slice(1))
  return { header, rows: lines.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]]))) }
}

const REGISTRATION_HEADERS = [
  'الاسم',
  'البريد الإلكتروني',
  'التخصص',
  'المرحلة الدراسية',
  'الجنس',
  'الحالة',
  'تاريخ التسجيل',
  'الترتيب في قائمة الانتظار',
]
const ACCOUNT_HEADERS = ['الاسم', 'البريد الإلكتروني', 'التخصص', 'المرحلة الدراسية', 'الجنس', 'الإعلانات', 'تاريخ إنشاء الحساب']

let db: pg.Client

beforeAll(async () => {
  db = await pgAdmin()
})

afterAll(async () => {
  await db?.end()
})

describe('who may export', () => {
  it('a signed-in non-admin gets 403 for both kinds, with no redirect', async () => {
    const user = SEED.user(1)
    const accounts = await get('all-accounts', '', user)
    expect(accounts.status).toBe(403)
    expect(accounts.headers.get('location')).toBeNull()
    expect(await accounts.text()).toBe('')
    expect((await get('event-registrations', `?event=${SEED.events.fullWithWaitlist}`, user)).status).toBe(403)
  })

  it('a signed-out visitor gets 403', async () => {
    expect((await get('all-accounts', '', null)).status).toBe(403)
    expect((await get('event-registrations', `?event=${SEED.events.fullWithWaitlist}`, null)).status).toBe(403)
  })

  it('a signed-in user with no profile gets 403', async () => {
    expect((await get('all-accounts', '', await createUser({ withProfile: false }))).status).toBe(403)
  })

  it('a non-admin asking for an unknown kind gets 403, not 404 (admin is checked first)', async () => {
    expect((await get('nope', '', SEED.user(1))).status).toBe(403)
  })
})

describe('kind and ?event', () => {
  it("kind = 'nope' → 404", async () => {
    expect((await get('nope')).status).toBe(404)
  })

  it('event-registrations without ?event, or with one that is not a positive integer → 400', async () => {
    for (const query of ['', '?event=', '?event=abc', '?event=0', '?event=-3', '?event=1.5', '?event=102abc']) {
      expect((await get('event-registrations', query)).status, query).toBe(400)
    }
  })

  it('event-registrations for an event that does not exist → 404', async () => {
    expect((await get('event-registrations', '?event=999999')).status).toBe(404)
  })
})

describe('all-accounts', () => {
  it('is a UTF-8 CSV attachment named for today in Riyadh', async () => {
    const res = await get('all-accounts')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    const today = riyadhDateKey(new Date().toISOString())
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="accounts-${today}.csv"`)
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has the Arabic headers in order', async () => {
    const { header } = await table(await get('all-accounts'))
    expect(header).toEqual(ACCOUNT_HEADERS)
  })

  it('includes a profile with announcements_opt_in = false, with Arabic labels', async () => {
    const { rows } = await table(await get('all-accounts'))
    const u02 = rows.find((r) => r['البريد الإلكتروني'] === 'u02@test.local')
    expect(u02).toMatchObject({
      'الاسم': 'مستخدم 02',
      'التخصص': 'الهندسة الميكانيكية', // ME
      'المرحلة الدراسية': 'ماجستير', // MASTER
      'الجنس': 'أنثى',
      'الإعلانات': 'لا',
    })
    const u01 = rows.find((r) => r['البريد الإلكتروني'] === 'u01@test.local')
    expect(u01).toMatchObject({ 'الجنس': 'ذكر', 'الإعلانات': 'نعم' })
  })

  it('shows major_other for OTHER', async () => {
    const { rows } = await table(await get('all-accounts'))
    expect(rows.find((r) => r['البريد الإلكتروني'] === 'u10@test.local')?.['التخصص']).toBe('Mechanical Engineering')
  })

  it('writes created_at in Riyadh time with Arabic digits', async () => {
    const { rows } = await table(await get('all-accounts'))
    const { rows: [profile] } = await db.query<{ created_at: Date }>("select created_at from profiles where email = 'u02@test.local'")
    const { formatRiyadh } = await import('@/lib/time/riyadh')
    expect(rows.find((r) => r['البريد الإلكتروني'] === 'u02@test.local')?.['تاريخ إنشاء الحساب']).toBe(
      formatRiyadh(profile.created_at.toISOString(), 'datetime', 'ar'),
    )
  })

  describe('with more accounts than one API page (max_rows = 1000)', () => {
    const PREFIX = 'a14-bulk-'

    beforeAll(async () => {
      await db.query(`select tests.create_user($1 || n || '@test.local') from generate_series(1, 1005) as n`, [PREFIX])
    })

    afterAll(async () => {
      await db.query(`delete from auth.users where email like $1`, [`${PREFIX}%`])
    })

    it('lists every account', async () => {
      const { rows: [{ n }] } = await db.query<{ n: number }>('select count(*)::int as n from profiles')
      const { rows } = await table(await get('all-accounts'))
      expect(n).toBeGreaterThan(1000)
      expect(rows).toHaveLength(n)
      expect(new Set(rows.map((r) => r['البريد الإلكتروني'])).size).toBe(n)
    })
  })
})

describe('event-registrations', () => {
  const event = SEED.events.fullWithWaitlist // 102: u01–u10 registered, u11–u13 waitlisted in that order

  it('is a UTF-8 CSV attachment named for the event', async () => {
    const res = await get('event-registrations', `?event=${event}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="registrations-${event}.csv"`)
  })

  it('has the Arabic headers in order', async () => {
    const { header } = await table(await get('event-registrations', `?event=${event}`))
    expect(header).toEqual(REGISTRATION_HEADERS)
  })

  it('event 102 → 13 data rows; the first waitlisted row has position 1', async () => {
    const { rows } = await table(await get('event-registrations', `?event=${event}`))
    expect(rows).toHaveLength(13)
    const firstWaitlisted = rows.find((r) => r['الحالة'] === 'في قائمة الانتظار')
    expect(firstWaitlisted?.['الترتيب في قائمة الانتظار']).toBe('1')
  })

  it('lists registered rows first (empty position), then the waitlist in order', async () => {
    const { rows } = await table(await get('event-registrations', `?event=${event}`))
    expect(rows.map((r) => r['البريد الإلكتروني'])).toEqual(
      Array.from({ length: 13 }, (_, i) => `u${String(i + 1).padStart(2, '0')}@test.local`),
    )
    expect(rows.slice(0, 10).every((r) => r['الحالة'] === 'مسجّل' && r['الترتيب في قائمة الانتظار'] === '')).toBe(true)
    expect(rows.slice(10).map((r) => r['الترتيب في قائمة الانتظار'])).toEqual(['1', '2', '3'])
  })

  it('uses Arabic labels, major_other for OTHER, and Riyadh time for registered at', async () => {
    const { rows } = await table(await get('event-registrations', `?event=${event}`))
    expect(rows[0]).toMatchObject({
      'الاسم': 'مستخدم 01',
      'التخصص': 'الهندسة الكهربائية', // EE
      'المرحلة الدراسية': 'بكالوريوس', // BACHELOR
      'الجنس': 'ذكر',
    })
    expect(rows[9]['التخصص']).toBe('Mechanical Engineering') // u10: OTHER
    const { rows: [reg] } = await db.query<{ created_at: Date }>(
      `select created_at from registrations where event_id = $1 and user_id = $2`,
      [event, SEED.user(1).id],
    )
    const { formatRiyadh } = await import('@/lib/time/riyadh')
    expect(rows[0]['تاريخ التسجيل']).toBe(formatRiyadh(reg.created_at.toISOString(), 'datetime', 'ar'))
  })

  it('orders registered by created_at, then waitlisted by position, then cancelled by cancelled_at', async () => {
    const eventId = await createEvent()
    const users = await Promise.all(['r1', 'r2', 'w1', 'w2', 'c1', 'c2'].map((tag) => createUser({ email: `a14-${tag}-${eventId}@test.local` })))
    const [r1, r2, w1, w2, c1, c2] = users
    // inserted out of order; timestamps set below make the intended order unambiguous
    for (const [user, status] of [
      [c2, 'cancelled'],
      [w2, 'waitlisted'],
      [r2, 'registered'],
      [c1, 'cancelled'],
      [w1, 'waitlisted'],
      [r1, 'registered'],
    ] as const) {
      await addRegistration(user.id, eventId, status)
    }
    const at = async (user: { id: string }, column: string, minutesAgo: number) =>
      db.query(`update registrations set ${column} = now() - make_interval(mins => $3) where event_id = $1 and user_id = $2`, [
        eventId,
        user.id,
        minutesAgo,
      ])
    await at(r1, 'created_at', 60)
    await at(r2, 'created_at', 50)
    await at(w1, 'waitlisted_at', 40)
    await at(w2, 'waitlisted_at', 30)
    // c2 registered before c1 but cancelled after it: cancelled rows follow cancelled_at
    await at(c2, 'created_at', 120)
    await at(c1, 'created_at', 90)
    await at(c1, 'cancelled_at', 20)
    await at(c2, 'cancelled_at', 10)

    const { rows } = await table(await get('event-registrations', `?event=${eventId}`))
    expect(rows.map((r) => r['البريد الإلكتروني'])).toEqual([r1, r2, w1, w2, c1, c2].map((u) => u.email))
    expect(rows.map((r) => r['الحالة'])).toEqual(['مسجّل', 'مسجّل', 'في قائمة الانتظار', 'في قائمة الانتظار', 'ملغى', 'ملغى'])
    expect(rows.map((r) => r['الترتيب في قائمة الانتظار'])).toEqual(['', '', '1', '2', '', ''])
  })

  it('a name Excel would run as a formula comes out as text', async () => {
    const eventId = await createEvent()
    const user = await createUser({ email: `a14-formula-${eventId}@test.local` })
    await db.query(`update profiles set full_name_ar = '=HYPERLINK("http://x","y")' where id = $1`, [user.id])
    await addRegistration(user.id, eventId)
    const { rows } = await table(await get('event-registrations', `?event=${eventId}`))
    expect(rows[0]['الاسم']).toBe(`'=HYPERLINK("http://x","y")`)
  })

  it('a known event with no registrations gives the header line only', async () => {
    const eventId = await createEvent()
    const res = await get('event-registrations', `?event=${eventId}`)
    expect(res.status).toBe(200)
    const { header, rows } = await table(res)
    expect(header).toEqual(REGISTRATION_HEADERS)
    expect(rows).toEqual([])
  })
})
