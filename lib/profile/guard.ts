import 'server-only'
import { getSession } from '@/lib/auth/session'
import { supabaseProdServer } from '@/lib/db/prod'

/*
  The server side of the profile step (dev-2 D2-7, spec §7.2): browsing needs no profile, actions
  do. An action that needs one wraps its work in withProfile; a { needsProfile: true } result tells
  the client to open the profile overlay (useProfileGate) and run the action again once it is saved.
*/

/** whether the signed-in person has a profiles row; false when nobody is signed in */
export async function hasProfile(): Promise<boolean> {
  const session = await getSession()
  return session ? profileExists(session.userId) : false
}

/**
 * Runs `action` only for a signed-in person with a profile. No session → throws
 * Error('unauthenticated'); no profile row → { needsProfile: true }, and the action is not called.
 */
export async function withProfile<T>(action: () => Promise<T>): Promise<T | { needsProfile: true }> {
  const session = await getSession()
  if (!session) throw new Error('unauthenticated')
  if (!(await profileExists(session.userId))) return { needsProfile: true }
  return await action()
}

/**
 * Through the person's own session, so row-level security shows only their own row. A failed
 * lookup throws: it is neither "no profile" (an overlay for someone who has one) nor "has one"
 * (an action run without one).
 */
async function profileExists(userId: string): Promise<boolean> {
  const db = await supabaseProdServer()
  const { data, error } = await db.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (error) throw error
  return data !== null
}
