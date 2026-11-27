import { getSession } from '@/lib/auth/session'
import { toCsv } from '@/lib/csv/to-csv'
import { label } from '@/lib/data/labels'
import { supabaseProdServer } from '@/lib/db/prod'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh, riyadhDateKey } from '@/lib/time/riyadh'

/*
  The admin's CSV downloads (A-14; plan T18):
  - /admin/export/event-registrations?event=<id>: one event's registrations
  - /admin/export/all-accounts: every account («عموم المسجّلين»), whatever its announcement consent

  The admin check comes first, before the kind or ?event is looked at, so a non-admin learns nothing
  (P-1). It follows requireAdmin's pattern (D1-13), but a download answers 403 instead of
  redirecting. Reads use the admin's own session (supabaseProdServer, never the service key), so
  the admin policies (A-4) decide what is returned.

  Admin is Arabic only, so both files are Arabic whatever language the people in them use. The
  files open in Excel with Arabic intact: toCsv writes the UTF-8 byte order mark.
*/

type Kind = 'event-registrations' | 'all-accounts'

type Person = {
  full_name_ar: string
  email: string
  major_code: string
  major_other: string | null
  academic_level_code: string
  gender: 'male' | 'female'
}

type RegistrationRow = {
  id: number
  status: 'registered' | 'waitlisted' | 'cancelled'
  created_at: string
  waitlisted_at: string | null
  cancelled_at: string | null
  profiles: Person
}

type AccountRow = Person & { id: string; announcements_opt_in: boolean; created_at: string }

type Cell = string | number | null

/** PostgREST answers no request with more rows than this (max_rows in supabase/config.toml) */
const PAGE = 1000

const status = (code: number) => new Response(null, { status: code, headers: { 'Cache-Control': 'no-store' } })

const column = (key: string, header: StringKey) => ({ key, header: t('ar', header) })

const REGISTRATION_COLUMNS = [
  column('name', 'admin.export.col.name'),
  column('email', 'admin.export.col.email'),
  column('major', 'admin.export.col.major'),
  column('level', 'admin.export.col.level'),
  column('gender', 'admin.export.col.gender'),
  column('status', 'admin.export.col.status'),
  column('registeredAt', 'admin.export.col.registeredAt'),
  column('waitlistPosition', 'admin.export.col.waitlistPosition'),
]

const ACCOUNT_COLUMNS = [
  column('name', 'admin.export.col.name'),
  column('email', 'admin.export.col.email'),
  column('major', 'admin.export.col.major'),
  column('level', 'admin.export.col.level'),
  column('gender', 'admin.export.col.gender'),
  column('announcements', 'admin.export.col.announcements'),
  column('createdAt', 'admin.export.col.createdAt'),
]

const STATUS_KEY: Record<RegistrationRow['status'], StringKey> = {
  registered: 'admin.export.status.registered',
  waitlisted: 'admin.export.status.waitlisted',
  cancelled: 'admin.export.status.cancelled',
}

/** name, email, major, level and gender, as the admin reads them */
function person(p: Person): Record<string, Cell> {
  return {
    name: p.full_name_ar,
    email: p.email,
    major: p.major_code === 'OTHER' ? p.major_other : label('majors', p.major_code, 'ar'),
    level: label('levels', p.academic_level_code, 'ar'),
    gender: t('ar', p.gender === 'male' ? 'admin.export.gender.male' : 'admin.export.gender.female'),
  }
}

/** every row, a page at a time, in a stable order (`page` must order by a unique column) */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(`admin export: could not read (${error.message})`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/** earliest first, nulls last, then by id */
function byTime(column: 'created_at' | 'waitlisted_at' | 'cancelled_at') {
  return (a: RegistrationRow, b: RegistrationRow) => {
    const x = a[column] === null ? Infinity : Date.parse(a[column])
    const y = b[column] === null ? Infinity : Date.parse(b[column])
    return x === y ? a.id - b.id : x < y ? -1 : 1
  }
}

type Db = Awaited<ReturnType<typeof supabaseProdServer>>

async function eventRegistrations(db: Db, eventId: number): Promise<Response> {
  const { data: event, error } = await db.from('events').select('id').eq('id', eventId).maybeSingle()
  if (error) throw new Error(`admin export: could not read the event (${error.message})`)
  if (!event) return status(404)

  const rows = await readAll<RegistrationRow>((from, to) =>
    db
      .from('registrations')
      .select('id, status, created_at, waitlisted_at, cancelled_at, profiles(full_name_ar, email, major_code, major_other, academic_level_code, gender)')
      .eq('event_id', eventId)
      .order('id')
      .range(from, to)
      .overrideTypes<RegistrationRow[], { merge: false }>(),
  )

  // registered by created_at, then the waitlist by position, then cancelled by cancelled_at
  const registered = rows.filter((r) => r.status === 'registered').sort(byTime('created_at'))
  const waitlisted = rows.filter((r) => r.status === 'waitlisted').sort(byTime('waitlisted_at'))
  const cancelled = rows.filter((r) => r.status === 'cancelled').sort(byTime('cancelled_at'))

  const line = (r: RegistrationRow, position: number | null) => ({
    ...person(r.profiles),
    status: t('ar', STATUS_KEY[r.status]),
    registeredAt: formatRiyadh(r.created_at, 'datetime', 'ar'),
    waitlistPosition: position,
  })
  const csv = toCsv(
    [
      ...registered.map((r) => line(r, null)),
      ...waitlisted.map((r, i) => line(r, i + 1)),
      ...cancelled.map((r) => line(r, null)),
    ],
    REGISTRATION_COLUMNS,
  )
  return download(csv, `registrations-${eventId}.csv`)
}

async function allAccounts(db: Db): Promise<Response> {
  const rows = await readAll<AccountRow>((from, to) =>
    db
      .from('profiles')
      .select('id, full_name_ar, email, major_code, major_other, academic_level_code, gender, announcements_opt_in, created_at')
      .order('created_at')
      .order('id')
      .range(from, to)
      .overrideTypes<AccountRow[], { merge: false }>(),
  )
  const csv = toCsv(
    rows.map((p) => ({
      ...person(p),
      announcements: t('ar', p.announcements_opt_in ? 'admin.export.yes' : 'admin.export.no'),
      createdAt: formatRiyadh(p.created_at, 'datetime', 'ar'),
    })),
    ACCOUNT_COLUMNS,
  )
  return download(csv, `accounts-${riyadhDateKey(new Date().toISOString())}.csv`)
}

function download(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // personal data: never kept by a browser or CDN cache
      'Cache-Control': 'no-store',
    },
  })
}

/** ?event as a positive integer, or null */
function eventParam(req: Request): number | null {
  const raw = new URL(req.url).searchParams.get('event') ?? ''
  if (!/^[1-9]\d*$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

/**
 * kind ∈ 'event-registrations' (requires ?event=<id>) | 'all-accounts'.
 * Not admin (or signed out) → 403, checked first; unknown kind → 404; ?event missing or not a
 * positive integer → 400; no such event → 404.
 */
export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }): Promise<Response> {
  const session = await getSession()
  if (!session) return status(403)
  const db = await supabaseProdServer()
  const { data: profile, error } = await db.from('profiles').select('is_admin').eq('id', session.userId).maybeSingle()
  // the profile can't be read → throw, so nobody gets a file on an error (P-1)
  if (error) throw new Error(`admin export: could not read the profile (${error.message})`)
  if (profile?.is_admin !== true) return status(403)

  const kind = (await ctx.params).kind as Kind | string
  if (kind === 'all-accounts') return allAccounts(db)
  if (kind !== 'event-registrations') return status(404)
  const eventId = eventParam(req)
  if (eventId === null) return status(400)
  return eventRegistrations(db, eventId)
}
