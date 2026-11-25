'use server'
import { revalidatePath } from 'next/cache'
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

  const db = await supabaseProdServer()
  const { data: existing, error: readError } = await db.from('profiles').select('announcements_opt_in, locale').eq('id', session.userId).maybeSingle()
  if (readError) throw readError
  const now = new Date().toISOString()

  if (!existing) {
    // the first save comes from the profile step (D2-7), which sends the page's language
    const { error } = await db.from('profiles').insert({ id: session.userId, email: session.email, ...profile, announcements_updated_at: now })
    if (error) throw error
    await applyAnnouncementChoice(session.email, profile.announcements_opt_in, 'signup')
    await mirrorLocale(session.userId, profile.locale)
  } else {
    const optInChanged = existing.announcements_opt_in !== profile.announcements_opt_in
    const { error } = await db
      .from('profiles')
      .update(optInChanged ? { ...profile, announcements_updated_at: now } : profile)
      .eq('id', session.userId)
    if (error) throw error
    if (optInChanged) await applyAnnouncementChoice(session.email, profile.announcements_opt_in, 'account')
    if (existing.locale !== profile.locale) await mirrorLocale(session.userId, profile.locale)
  }

  revalidatePath('/ar/account')
  revalidatePath('/en/account')
  return { ok: true }
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
