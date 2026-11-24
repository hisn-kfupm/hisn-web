import { redirect } from 'next/navigation'
// STAND-IN imports: '@/lib/auth/session' when D2-4 is on main, '@/lib/db/prod' when A-2 is
import { getSession } from '@/lib/auth/session-stub'
import { supabaseProdServer } from '@/lib/db/prod-stub'

export const ADMIN_SIGN_IN = '/ar/sign-in?returnTo=/admin'

/**
 * The admin guard (dev-1 D1-13; spec §7.11, HR-4). Call it first in every file under app/admin/: the
 * layout, each page and each server action. A layout alone isn't enough, because layouts don't run
 * again on navigation between their pages; the database policies (A-4) are the last line.
 *
 * - no session → /ar/sign-in, coming back to /admin
 * - a profile that is missing or not is_admin → /ar
 * - the profile can't be read → throws, so nobody gets in on an error (P-1)
 *
 * It reads the caller's own profile with their own session (supabaseProdServer, never the service
 * key). That client reads the request's cookies, so the check runs on every request; never call
 * it inside 'use cache'.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await getSession()
  if (!session) redirect(ADMIN_SIGN_IN)
  const db = await supabaseProdServer()
  const { data, error } = await db.from('profiles').select('is_admin').eq('id', session.userId).maybeSingle()
  if (error) throw new Error(`requireAdmin: could not read the profile (${error.message})`)
  if (data?.is_admin !== true) redirect('/ar')
  return { userId: session.userId }
}
