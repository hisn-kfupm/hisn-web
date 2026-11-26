'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { safeReturnTo } from '@/lib/auth/return-to'
import { supabaseProdServer } from '@/lib/db/prod'
import { normalizeEmail } from '@/lib/email/normalize'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locale'
import { latinDigits } from '@/lib/i18n/number'
import { reportError } from '@/lib/monitoring/report'

/*
  Sign-in with an email code (dev-2 D2-5, spec §7.1). Outside app/[locale]: only pages move there.
  A server action's arguments come from the browser, so each one is checked like any input.
  Failures that can lock everyone out are reported (spec §11): sign-in is the one email that can't
  wait for the outbox.
*/

const emailSchema = z.string().trim().email()
const ALERT = { alert: 'sign-in' }

/** Step 1: emails a 6-digit code to the address, creating the account on a first sign-in. */
export async function sendCode(email: string, locale: Locale): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'rate_limited' | 'send_failed' }> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  try {
    const db = await supabaseProdServer()
    const { error } = await db.auth.signInWithOtp({
      email: normalizeEmail(parsed.data),
      // the code email's language: A-19's template switches on user_metadata.locale
      options: { shouldCreateUser: true, data: { locale: isLocale(locale) ? locale : DEFAULT_LOCALE } },
    })
    if (!error) return { ok: true }
    if (error.status === 429) {
      // one person asking too often, or the project's hourly email cap, which stops everyone
      reportError(error, { level: 'error', tags: ALERT })
      return { ok: false, reason: 'rate_limited' }
    }
    reportError(error, { level: 'fatal', tags: ALERT })
  } catch (thrown) {
    // the server's own setup or auth-js failed: nobody can sign in
    reportError(thrown, { level: 'fatal', tags: ALERT })
  }
  return { ok: false, reason: 'send_failed' }
}

/** Supabase could not check the code at all: no connection (0), rate limited (429) or a server error */
const unavailable = (status: number | undefined) => status === 0 || status === 429 || (status !== undefined && status >= 500)

/**
 * Step 2: checks the code; when it is right, signs in and goes back to returnTo (same-site only).
 * An outage is not the person's mistake, so it is reported and thrown rather than answered 'wrong';
 * the form then says the code could not be checked.
 */
export async function verifyCode(email: string, code: string, returnTo?: string): Promise<{ ok: false; reason: 'wrong' | 'expired' } | never> {
  if (typeof email !== 'string' || typeof code !== 'string') return { ok: false, reason: 'wrong' }
  let error: { status?: number; message: string } | null
  try {
    const db = await supabaseProdServer()
    // a code typed on an Arabic keypad arrives as ٠–٩
    ;({ error } = await db.auth.verifyOtp({ email: normalizeEmail(email), token: latinDigits(code), type: 'email' }))
  } catch (thrown) {
    reportError(thrown, { level: 'fatal', tags: ALERT })
    throw thrown
  }
  if (error && unavailable(error.status)) {
    reportError(error, { level: error.status === 429 ? 'error' : 'fatal', tags: ALERT })
    throw new Error('sign-in code could not be checked')
  }
  if (error) return { ok: false, reason: /expired/i.test(error.message) ? 'expired' : 'wrong' }
  redirect(safeReturnTo(returnTo))
}
