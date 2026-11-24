import { connection } from 'next/server'
import { DEMO_SESSION } from '@/lib/auth/session-stub'
import { standInRows, standInSeatsTaken, STAND_IN_IDS, type EventRow } from '@/lib/events/stand-in'

/*
  STAND-IN for A-2's supabaseProdServer() (lib/db/prod.ts), so the admin code can be written as it
  will run: the same calls (from, select, eq, gt, in, order, limit, range, maybeSingle) answered
  from memory as { data, error }, at most 1000 rows per answer, like PostgREST's max_rows. When A-2 is on main: point the admin imports at
  '@/lib/db/prod', move memoryClient to tests/fixtures (tests/unit/admin-events.test.tsx uses it),
  and delete this file.

  The tables come from the stand-in events. There is one profile, the demo user of
  lib/auth/session-stub.ts, and it is an admin; it exists only while DEMO_SIGNED_IN=1, the switch
  that already previews the signed-in states, so /admin can be previewed the same way. No real
  data is read here, ever.
*/

type Row = Record<string, unknown>

/** PostgREST answers no request with more rows than this (max_rows in supabase/config.toml) */
const MAX_ROWS = 1000
type Result<T> = { data: T; error: { message: string } | null }

class MemoryQuery implements PromiseLike<Result<Row[] | null>> {
  private filters: ((row: Row) => boolean)[] = []
  private sorts: { column: string; ascending: boolean }[] = []
  private window: [number, number] | null = null
  private cap: number | null = null
  private columns: string[] | null = null

  constructor(private readonly rows: Row[] | undefined, private readonly table: string) {}

  select(columns: string): this {
    this.columns = columns === '*' ? null : columns.split(',').map((c) => c.trim())
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value)
    return this
  }

  gt(column: string, value: unknown): this {
    this.filters.push((row) => compare(row[column], value) > 0)
    return this
  }

  in(column: string, values: readonly unknown[]): this {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.sorts.push({ column, ascending: options.ascending ?? true })
    return this
  }

  limit(count: number): this {
    this.cap = count
    return this
  }

  /** inclusive, like PostgREST */
  range(from: number, to: number): this {
    this.window = [from, to]
    return this
  }

  async maybeSingle(): Promise<Result<Row | null>> {
    const { data, error } = this.run()
    if (error || !data) return { data: null, error }
    if (data.length > 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
    return { data: data[0] ?? null, error: null }
  }

  then<A = Result<Row[] | null>, B = never>(
    onfulfilled?: ((value: Result<Row[] | null>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }

  private run(): Result<Row[] | null> {
    if (!this.rows) return { data: null, error: { message: `relation "public.${this.table}" does not exist` } }
    let out = this.rows.filter((row) => this.filters.every((keep) => keep(row)))
    for (const { column, ascending } of [...this.sorts].reverse()) {
      out = [...out].sort((a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1))
    }
    if (this.window) out = out.slice(this.window[0], this.window[1] + 1)
    out = out.slice(0, Math.min(this.cap ?? MAX_ROWS, MAX_ROWS))
    const columns = this.columns
    return { data: columns ? out.map((row) => Object.fromEntries(columns.map((c) => [c, row[c]]))) : out, error: null }
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  return (a as number | string) < (b as number | string) ? -1 : 1
}

/** an in-memory database answering the query calls the admin code makes */
export function memoryClient(tables: Record<string, Row[]>) {
  return { from: (table: string) => new MemoryQuery(tables[table], table) }
}

/** the events table has no meeting link: it lives in event_private (A-3) */
function withoutMeetingUrl(row: EventRow): Omit<EventRow, 'meeting_url'> {
  const copy: Partial<EventRow> = { ...row }
  delete copy.meeting_url
  return copy as Omit<EventRow, 'meeting_url'>
}

/** the stand-in tables: stand-in events, their taken seats as registrations, the demo admin */
function standInTables(now: number): Record<string, Row[]> {
  const events = standInRows(now).map((row) => ({
    ...withoutMeetingUrl(row),
    // the first upcoming published event shows the «sending started» state
    announcement_started_at: row.id === 9001 ? new Date(now - 86_400_000).toISOString() : null,
  }))
  const registrations: Row[] = []
  for (const e of events) {
    const taken = standInSeatsTaken(e.id) ?? 0
    for (let i = 0; i < taken; i++) registrations.push({ event_id: e.id, status: 'registered' })
    // a full event has people waiting, and a cancelled one kept its records (spec §7.11)
    if (e.capacity !== null && taken >= e.capacity) for (let i = 0; i < 4; i++) registrations.push({ event_id: e.id, status: 'waitlisted' })
    if (e.id === STAND_IN_IDS.cancelled) registrations.push({ event_id: e.id, status: 'cancelled' })
  }
  const profiles = process.env.DEMO_SIGNED_IN === '1' ? [{ id: DEMO_SESSION.userId, is_admin: true }] : []
  return { events, registrations: registrations.map((r, i) => ({ id: i + 1, ...r })), profiles }
}

/**
 * STAND-IN: same name and shape as A-2's cookie-bound client. A-2's reads cookies(), which keeps
 * every caller out of prerenders and caches; connection() does the same here.
 */
export async function supabaseProdServer() {
  await connection()
  return memoryClient(standInTables(Date.now()))
}
