// STAND-IN import: '@/lib/db/prod' when A-2 is on main
import { supabaseProdServer } from '@/lib/db/prod-stub'
import { summarizeCounts, type RegistrationStatus } from './counts'

/*
  The admin events list's data (dev-1 D1-13; spec §7.11), read with the admin's own session: the
  A-4 policies let an admin read every event (drafts too) and every registration. Call
  requireAdmin() before this.
*/

export type AdminEventStatus = 'draft' | 'published' | 'cancelled'

export type AdminEvent = {
  id: number
  title: string
  startsAt: string
  endsAt: string
  status: AdminEventStatus
  capacity: number | null
  announcementStartedAt: string | null
  registered: number
  waitlisted: number
}

const EVENT_COLUMNS = 'id,title,starts_at,ends_at,status,capacity,announcement_started_at'

/** rows asked for per request; the API never returns more than its max_rows (1000, supabase/config.toml) */
export const PAGE = 1000

type Row = Record<string, unknown>
type Page = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>

/**
 * Every event with its counts, split at `now` (the request's time): events that haven't ended
 * (soonest first), then past ones (latest first). Throws on any database error, so the list never
 * shows wrong counts.
 */
export async function adminEvents(now: number = Date.now()): Promise<{ upcoming: AdminEvent[]; past: AdminEvent[] }> {
  const db = await supabaseProdServer()
  const [eventRows, registrationRows] = await Promise.all([
    readAll((after) => db.from('events').select(EVENT_COLUMNS).gt('id', after).order('id', { ascending: true }).limit(PAGE)),
    readAll((after) =>
      db
        .from('registrations')
        .select('id,event_id,status')
        .in('status', ['registered', 'waitlisted'])
        .gt('id', after)
        .order('id', { ascending: true })
        .limit(PAGE),
    ),
  ])
  const counts = summarizeCounts(registrationRows as { event_id: number; status: RegistrationStatus }[])
  const events = eventRows
    .map((row): AdminEvent => {
      const id = row.id as number
      return {
        id,
        title: row.title as string,
        startsAt: row.starts_at as string,
        endsAt: row.ends_at as string,
        status: row.status as AdminEventStatus,
        capacity: row.capacity as number | null,
        announcementStartedAt: row.announcement_started_at as string | null,
        registered: counts[id]?.registered ?? 0,
        waitlisted: counts[id]?.waitlisted ?? 0,
      }
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id - b.id)
  return {
    upcoming: events.filter((e) => Date.parse(e.endsAt) > now),
    past: events.filter((e) => Date.parse(e.endsAt) <= now).reverse(),
  }
}

/**
 * All rows of a query, read in pages by id: each page starts after the last id seen (keyset), so
 * no row is skipped or read twice however many rows there are, and an empty page ends the read
 * whatever the API's row limit is. Each page is its own snapshot, so while people register or
 * cancel during the read a count can be off by the rows that changed, for that one page load; one
 * counting statement in the database (an RPC, A-owned) would close that gap.
 */
async function readAll(page: (afterId: number) => Page): Promise<Row[]> {
  const rows: Row[] = []
  for (let after = 0; ; ) {
    const { data, error } = await page(after)
    if (error) throw new Error(`adminEvents: ${error.message}`)
    if (!data || data.length === 0) return rows
    rows.push(...data)
    after = data[data.length - 1].id as number
  }
}
