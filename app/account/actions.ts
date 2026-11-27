'use server'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'
import { supabaseProdServer, supabaseProdService } from '@/lib/db/prod'
import type { FieldErrors } from '@/lib/forms/types'
import type { Locale } from '@/lib/i18n/locale'
import { reportError } from '@/lib/monitoring/report'
import { applyAnnouncementChoice } from '@/lib/profile/announcements'
import { profileErrors, profileSchema, type ProfileInput } from '@/lib/profile/schema'

/*
  The account's server actions (Abdulrahman builds /account on them). Outside app/[locale]: only
  pages move there. Profile writes go through the person's own session, so row-level security
  applies: the email is set once, from the session, and is_admin can't be written at all (HR-4).
*/

type Session = { userId: string; email: string }

/**
 * Saves the profile (dev-2 D2-6): an insert on the first save, an update after. The announcements
 * checkbox follows spec §10.2 (applyAnnouncementChoice), and the email language is mirrored into the
 * auth user's metadata, where the sign-in code email (A-19) reads it.
 */
export async function saveProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; errors: FieldErrors }> {
  const session = await getSession()
  if (!session) throw new Error('unauthenticated')
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: profileErrors(parsed.error) }
  const profile = parsed.data

  try {
    await writeProfile(session, profile)
  } catch (thrown) {
    // nothing is left half-done (see writeProfile), but a profile that can't be saved blocks registering
    reportError(thrown, { level: 'error' })
    throw thrown
  }
  // on every save, so a mirror that failed once is repaired by the next save
  await mirrorLocale(session.userId, profile.locale)
  revalidatePath('/ar/account')
  revalidatePath('/en/account')
  return { ok: true }
}

/**
 * The profile row and the announcement choice, ordered so that a failure part-way never sends the
 * person more than they asked for, and a retry finishes the job. For an account, its own checkbox
 * decides the audience (D2-13):
 * - opting in: the unsubscribe is removed first, then the row says yes; if the row write fails, the
 *   retry still sees a change and applies it again (applying it is idempotent);
 * - opting out: the row says no first, which alone stops announcements; then the unsubscribe is
 *   recorded (a failure there is reported, and the opt-out already holds).
 * - every later save at no records the unsubscribe again, changed or not: after a failure there, the row
 *   already says no, so the next save would otherwise see nothing to do. The upsert ignores an existing
 *   row, so repeating it is safe and keeps that row's source. When the choice didn't change, a failure
 *   there is reported and the save still succeeds: the row at no already stops announcements.
 */
async function writeProfile(session: Session, profile: ProfileInput): Promise<void> {
  const db = await supabaseProdServer()
  const now = new Date().toISOString()
  const optIn = profile.announcements_opt_in
  let stored = await storedChoice(db, session.userId)

  if (!stored) {
    // signup: only a yes changes email_unsubscribes, and it goes first
    await applyAnnouncementChoice(session.email, optIn, 'signup')
    // the first save comes from the profile step (D2-7), which sends the page's language
    const { error } = await db.from('profiles').insert({ id: session.userId, email: session.email, ...profile, announcements_updated_at: now })
    if (!error) return
    // 23505: another first save (a double tap) got there first; save over its row instead, as a later
    // save (so at no it records the unsubscribe too, like any later save)
    if (error.code !== '23505') throw error
    stored = await storedChoice(db, session.userId)
    if (!stored) throw error
  }

  const changed = stored.announcements_opt_in !== optIn
  const update = async () => {
    const { error } = await db
      .from('profiles')
      .update(changed ? { ...profile, announcements_updated_at: now } : profile)
      .eq('id', session.userId)
    if (error) throw error
  }
  if (changed && optIn) {
    await applyAnnouncementChoice(session.email, true, 'account')
    await update()
  } else {
    await update()
    if (!optIn && changed) await applyAnnouncementChoice(session.email, false, 'account')
    else if (!optIn) await keepOptOut(session.email)
  }
}

/** a save that keeps no: records an unsubscribe an earlier save may have failed to record; a failure is reported, not thrown */
async function keepOptOut(email: string): Promise<void> {
  try {
    await applyAnnouncementChoice(email, false, 'account')
  } catch (thrown) {
    reportError(thrown, { level: 'error' })
  }
}

async function storedChoice(db: SupabaseClient, userId: string): Promise<{ announcements_opt_in: boolean } | null> {
  const { data, error } = await db.from('profiles').select('announcements_opt_in').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** keeps user_metadata.locale equal to profiles.locale; a failure is reported and does not fail the save */
async function mirrorLocale(userId: string, locale: Locale): Promise<void> {
  try {
    const { error } = await supabaseProdService().auth.admin.updateUserById(userId, { user_metadata: { locale } })
    if (error) reportError(error, { level: 'error' })
  } catch (thrown) {
    reportError(thrown, { level: 'error' })
  }
}
