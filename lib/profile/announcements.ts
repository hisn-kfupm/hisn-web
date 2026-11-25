import 'server-only'
import { supabaseProdService } from '@/lib/db/prod'
import { normalizeEmail } from '@/lib/email/normalize'

/**
 * The profile checkbox's effect on email_unsubscribes (dev-2 D2-6, spec §10.2), exactly:
 *
 * | context | optIn | email_unsubscribes                                         |
 * |---------|-------|------------------------------------------------------------|
 * | signup  | true  | delete the row                                             |
 * | signup  | false | no change                                                  |
 * | account | true  | delete the row                                             |
 * | account | false | upsert { email, source: 'profile' }; an existing row keeps its own source |
 *
 * An existing row (from a link, a bounce or a complaint) keeps its source: the address is just as
 * unsubscribed, and where it came from stays on record.
 *
 * signup + false changes nothing and still sends nothing: once an account exists, the audience
 * (D2-13) ignores newsletter signups for its email, so the checkbox decides. This is the only way an
 * unsubscribe is reversed, and only from a signed-in session: newsletter_signup is open to anyone,
 * so letting it reverse one would let a stranger re-subscribe someone else's address.
 */
export async function applyAnnouncementChoice(email: string, optIn: boolean, context: 'signup' | 'account'): Promise<void> {
  const normalized = normalizeEmail(email)
  const db = supabaseProdService()
  if (optIn) {
    const { error } = await db.from('email_unsubscribes').delete().eq('email', normalized)
    if (error) throw error
  } else if (context === 'account') {
    const { error } = await db.from('email_unsubscribes').upsert({ email: normalized, source: 'profile' }, { onConflict: 'email', ignoreDuplicates: true })
    if (error) throw error
  }
}
