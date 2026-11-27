// Helpers for database tests (A-6). They run against local Supabase (`supabase start`, then `npm run db:reset`).
import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Env = {
  SUPABASE_DB_URL: string
  SUPABASE_JWT_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

// `supabase status -o env` names (CLI 3.x) → the names these helpers use (A-7's write-env.sh maps them the same way)
const FROM_STATUS: Record<keyof Env, string> = {
  SUPABASE_DB_URL: 'DB_URL',
  SUPABASE_JWT_SECRET: 'JWT_SECRET',
  NEXT_PUBLIC_SUPABASE_URL: 'API_URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ANON_KEY',
}

function readStatus(): Record<string, string> {
  const attempts: [string, string[]][] = [
    ['supabase', ['status', '-o', 'env']],
    ['npx', ['--yes', 'supabase', 'status', '-o', 'env']],
  ]
  for (const [cmd, args] of attempts) {
    try {
      const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      return Object.fromEntries(
        out
          .split('\n')
          .map((line) => /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim()))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => [m[1], m[2]]),
      )
    } catch {
      // try the next way of running the CLI
    }
  }
  throw new Error('tests/db: set SUPABASE_DB_URL, SUPABASE_JWT_SECRET, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or start local Supabase (`supabase start`)')
}

let cached: Env | null = null

/** The four settings from the environment (CI, `npm run env:local`); any missing one comes from `supabase status`. */
function env(): Env {
  if (cached) return cached
  const names = Object.keys(FROM_STATUS) as (keyof Env)[]
  const missing = names.filter((name) => !process.env[name])
  const status = missing.length ? readStatus() : {}
  const resolved = Object.fromEntries(names.map((name) => [name, process.env[name] || status[FROM_STATUS[name]]])) as Env
  const stillMissing = names.filter((name) => !resolved[name])
  if (stillMissing.length) throw new Error(`tests/db: missing ${stillMissing.join(', ')}`)
  cached = resolved
  return resolved
}

/** A Postgres connection as `postgres` (bypasses RLS). Call `end()` when done. */
export async function pgAdmin(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: env().SUPABASE_DB_URL })
  await client.connect()
  return client
}

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

function signJwt(payload: object): string {
  const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}`
  const signature = createHmac('sha256', env().SUPABASE_JWT_SECRET).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

/** A Supabase client signed in as `user` through the API, so row-level security applies. */
export function clientAs(user: { id: string; email: string }): SupabaseClient {
  const now = Math.floor(Date.now() / 1000)
  const token = signJwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 })
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env()
  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** A Supabase client with only the anon key. */
export function anonClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env()
  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: noSession })
}

async function withAdmin<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = await pgAdmin()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/** A new auth user (and, by default, a profile), through A-4's tests.create_user. */
export async function createUser(opts: { withProfile?: boolean; isAdmin?: boolean; email?: string } = {}): Promise<{ id: string; email: string }> {
  const email = opts.email ?? `user-${randomUUID()}@test.local`
  const id = await withAdmin(async (client) => {
    const { rows } = await client.query<{ id: string }>('select tests.create_user($1, $2, $3) as id', [
      email,
      opts.withProfile ?? true,
      opts.isAdmin ?? false,
    ])
    return rows[0].id
  })
  return { id, email }
}

/** A new event through A-4's tests.create_event; intervals like '7 days'. */
export async function createEvent(opts: {
  capacity?: number | null
  status?: 'draft' | 'published' | 'cancelled'
  startsIn?: string
  closesIn?: string | null
  format?: 'in_person' | 'online'
} = {}): Promise<number> {
  return withAdmin(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      'select tests.create_event($1::int, $2::text, $3::interval, $4::interval, $5::text) as id',
      [opts.capacity ?? null, opts.status ?? 'published', opts.startsIn ?? '7 days', opts.closesIn ?? null, opts.format ?? 'in_person'],
    )
    return Number(rows[0].id)
  })
}

/** A registration through A-4's tests.add_registration (waitlisted rows get waitlisted_at). */
export async function addRegistration(userId: string, eventId: number, status: 'registered' | 'waitlisted' | 'cancelled' = 'registered'): Promise<number> {
  return withAdmin(async (client) => {
    const { rows } = await client.query<{ id: string }>('select tests.add_registration($1::uuid, $2::bigint, $3::text) as id', [
      userId,
      eventId,
      status,
    ])
    return Number(rows[0].id)
  })
}
