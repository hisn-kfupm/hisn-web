'use server'
import { redirect } from 'next/navigation'
import { supabaseProdServer } from '@/lib/db/prod'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locale'

/*
  The signed-in user, and signing out (dev-2 D2-4). A 'use server' file because the header's
  account menu, a client component (dev-1 D1-5), imports signOut directly.
*/

/** The signed-in user, or null. getUser() checks the token with Supabase Auth; getSession() would trust the cookie. */
export async function getSession(): Promise<{ userId: string; email: string } | null> {
  const db = await supabaseProdServer()
  const { data } = await db.auth.getUser()
  const user = data.user
  return user?.email ? { userId: user.id, email: user.email } : null
}

/**
 * Signs out, then goes to the homepage in the same language. The locale comes from the browser,
 * so anything but a known locale goes to /ar.
 */
export async function signOut(locale: Locale): Promise<void> {
  const db = await supabaseProdServer()
  const { error } = await db.auth.signOut()
  // If revoking on the server fails, supabase-js keeps the session: still sign this device out (P-1).
  if (error) await db.auth.signOut({ scope: 'local' })
  redirect(`/${isLocale(locale) ? locale : DEFAULT_LOCALE}`)
}
