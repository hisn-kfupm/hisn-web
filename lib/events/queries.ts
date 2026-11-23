import type { PublicEvent } from './types'
import { stripDraft } from '@/lib/i18n/t'
import { standInRows, type EventRow } from './stand-in'
import { monthRangeUtc } from './month'

/*
  Read queries for public events (dev-1 D1-8).

  STAND-IN: until A-2 (supabaseProdServer) and A-3/A-6 (events table and seed) are on main, the
  rows come from ./stand-in.ts and are filtered here by the same rules the real queries use. Each
  function's comment has its real query. To switch: replace each body with that query, map the
  rows through toPublicEvent, delete stand-in.ts, and move tests/unit/queries.test.ts to tests/db/.
  Only this file changes; the pages keep calling the same functions.

  Note for the switch: the homepage caches with 'use cache', which can't read cookies(). Public
  reads need a client that doesn't touch cookies (anon key), or the page can't be cached.
*/

export const PUBLIC_EVENT_COLUMNS =
  'id,title,description,department_code,starts_at,ends_at,format,location,presenter,capacity,registration_closes_at,status,image_url,recording_url'

/** snake_case row → PublicEvent; copies only the public columns, so nothing else can leak */
export function toPublicEvent(row: Record<string, unknown>): PublicEvent {
  return {
    id: row.id as number,
    // stand-in copy carries « «مؤقت» »; demos (NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1) leave it out
    title: stripDraft(row.title as string),
    description: stripDraft(row.description as string),
    departmentCode: row.department_code as string | null,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    format: row.format as PublicEvent['format'],
    location: row.location as string | null,
    presenter: row.presenter === null ? null : stripDraft(row.presenter as string),
    capacity: row.capacity as number | null,
    registrationClosesAt: row.registration_closes_at as string,
    status: row.status as PublicEvent['status'],
    imageUrl: row.image_url as string | null,
    recordingUrl: row.recording_url as string | null,
  }
}

type ListOptions = { limit: number; departmentCode?: string }

const inDepartment = (code?: string) => (r: EventRow) => code === undefined || r.department_code === code

/**
 * Published events that haven't started, soonest first.
 * Real: db.from('events').select(PUBLIC_EVENT_COLUMNS).eq('status', 'published')
 *   .gt('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(limit)
 *   (+ .eq('department_code', departmentCode) when given)
 */
export async function upcomingEvents({ limit, departmentCode }: ListOptions): Promise<PublicEvent[]> {
  const now = Date.now()
  return standInRows(now)
    .filter((r) => r.status === 'published' && Date.parse(r.starts_at) > now)
    .filter(inDepartment(departmentCode))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, limit)
    .map(toPublicEvent)
}

/**
 * Published events that have ended and have a recording, newest first.
 * Real: db.from('events').select(PUBLIC_EVENT_COLUMNS).eq('status', 'published')
 *   .lt('ends_at', new Date().toISOString()).not('recording_url', 'is', null)
 *   .order('ends_at', { ascending: false }).limit(limit) (+ department filter)
 */
export async function latestRecordings({ limit, departmentCode }: ListOptions): Promise<PublicEvent[]> {
  const now = Date.now()
  return standInRows(now)
    .filter((r) => r.status === 'published' && Date.parse(r.ends_at) < now && r.recording_url !== null)
    .filter(inDepartment(departmentCode))
    .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))
    .slice(0, limit)
    .map(toPublicEvent)
}

/**
 * One event if it's published or cancelled; drafts and unknown ids give null.
 * Real: db.from('events').select(PUBLIC_EVENT_COLUMNS).eq('id', id)
 *   .in('status', ['published', 'cancelled']).maybeSingle()
 */
export async function getPublicEvent(id: number): Promise<PublicEvent | null> {
  const row = standInRows().find((r) => r.id === id && (r.status === 'published' || r.status === 'cancelled'))
  return row ? toPublicEvent(row) : null
}

/**
 * Whether getPublicEvent(id) would find an event, for the Proxy's 404 check (proxy.ts) before the
 * event page renders. Same rule: published or cancelled; drafts and unknown ids are false.
 * Real: db.from('events').select('id', { count: 'exact', head: true }).eq('id', id)
 *   .in('status', ['published', 'cancelled']) → count === 1
 */
export async function eventExists(id: number): Promise<boolean> {
  return (await getPublicEvent(id)) !== null
}

/**
 * Published and cancelled events that start inside the Riyadh month 'YYYY-MM', earliest first
 * (dev-1 D1-10, the calendar). Past events stay in: the calendar badges them «انتهت».
 * Real: const { from, to } = monthRangeUtc(month)
 *   db.from('events').select(PUBLIC_EVENT_COLUMNS).in('status', ['published', 'cancelled'])
 *   .gte('starts_at', from).lt('starts_at', to).order('starts_at', { ascending: true })
 */
export async function eventsInMonth(month: string): Promise<PublicEvent[]> {
  const { from, to } = monthRangeUtc(month)
  const [start, end] = [Date.parse(from), Date.parse(to)]
  return standInRows(Date.now())
    .filter((r) => r.status === 'published' || r.status === 'cancelled')
    .filter((r) => {
      const at = Date.parse(r.starts_at)
      return at >= start && at < end
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map(toPublicEvent)
}
