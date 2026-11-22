import { getSession } from '@/lib/auth/session-stub'

/*
  The visitor's own place in an event (dev-1 D1-11).

  STAND-IN: there is no auth (D2-4) and no registrations table (A-3) yet. getSession() is null for
  everyone (or a demo user with DEMO_SIGNED_IN=1) and the stand-in has no registrations, so both
  functions return null. The real queries are in each comment; the result handling is already in
  readMyStatus / readWaitlistPosition, which the switch keeps calling.
*/

type PgError = { code?: string; message?: string } | null

/** what .from('registrations').select('status').eq('event_id', id).maybeSingle() resolves to */
export type MyStatusQueryResult = { data: { status: string } | null; error: PgError }
/** what rpc('waitlist_position') resolves to */
export type WaitlistPositionRpcResult = { data: number | null; error: PgError }

/** own registration row → 'registered' | 'waitlisted' | null ('cancelled' or no row → null); errors throw */
export function readMyStatus({ data, error }: MyStatusQueryResult): 'registered' | 'waitlisted' | null {
  if (error) throw new Error(`my status failed: ${error.code ?? ''} ${error.message ?? ''}`.trim())
  const status = data?.status
  return status === 'registered' || status === 'waitlisted' ? status : null
}

/**
 * rpc('waitlist_position') → the position, or null. Error 42883 means the function does not exist
 * yet (until D2-9/D2-11 merge), so the position is unknown (null); any other error throws.
 */
export function readWaitlistPosition({ data, error }: WaitlistPositionRpcResult): number | null {
  if (error) {
    if (error.code === '42883') return null
    throw new Error(`waitlist_position failed: ${error.code ?? ''} ${error.message ?? ''}`.trim())
  }
  return data ?? null
}

/**
 * Real:
 *   const db = await supabaseProdServer()
 *   // RLS returns only the visitor's own rows
 *   return readMyStatus(await db.from('registrations').select('status').eq('event_id', eventId).maybeSingle())
 */
export async function myStatus(eventId: number): Promise<'registered' | 'waitlisted' | null> {
  if (!(await getSession()) || !Number.isInteger(eventId)) return null
  return readMyStatus({ data: null, error: null })
}

/**
 * Real:
 *   const db = await supabaseProdServer()
 *   return readWaitlistPosition(await db.rpc('waitlist_position', { p_event_id: eventId }))
 */
export async function myWaitlistPosition(eventId: number): Promise<number | null> {
  if (!(await getSession()) || !Number.isInteger(eventId)) return null
  return readWaitlistPosition({ data: null, error: null })
}
