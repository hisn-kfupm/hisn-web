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

/** the API returns at most this many rows per request (max_rows in supabase/config.toml) */
export const REGISTRATIONS_PAGE = 1000

type Db = Awaited<ReturnType<typeof supabaseProdServer>>

/**
 * Every event with its counts, split at `now` (the request's time): events that haven't ended
 * (soonest first), then past ones (latest first). Throws on any database error, so the list never
 * shows wrong counts.
 */
export async function adminEvents(now: number = Date.now()): Promise<{ upcoming: AdminEvent[]; past: AdminEvent[] }> {
  const db = await supabaseProdServer()
  const { data, error } = await db.from('events').select(EVENT_COLUMNS).order('starts_at', { ascending: true })
  if (error) throw new Error(`adminEvents: ${error.message}`)
  const counts = summarizeCounts(await liveRegistrations(db))
  const events = (data ?? []).map((row): AdminEvent => {
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
  return {
    upcoming: events.filter((e) => Date.parse(e.endsAt) > now),
    past: events.filter((e) => Date.parse(e.endsAt) <= now).reverse(),
  }
}

/** registered and waitlisted rows, page by page in id order, so none fall past the row limit */
async function liveRegistrations(db: Db): Promise<{ event_id: number; status: RegistrationStatus }[]> {
  const rows: { event_id: number; status: RegistrationStatus }[] = []
  for (let from = 0; ; from += REGISTRATIONS_PAGE) {
    const { data, error } = await db
      .from('registrations')
      .select('event_id,status')
      .in('status', ['registered', 'waitlisted'])
      .order('id', { ascending: true })
      .range(from, from + REGISTRATIONS_PAGE - 1)
    if (error) throw new Error(`adminEvents: ${error.message}`)
    const page = (data ?? []) as { event_id: number; status: RegistrationStatus }[]
    rows.push(...page)
    if (page.length < REGISTRATIONS_PAGE) return rows
  }
}
