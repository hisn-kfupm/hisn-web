'use server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { safeReturnTo } from '@/lib/auth/return-to'
import { supabaseProdServer } from '@/lib/db/prod'
import { normalizeEmail } from '@/lib/email/normalize'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locale'
import { reportError } from '@/lib/monitoring/report'

/*
  Sign-in with an email code (dev-2 D2-5, spec §7.1). Outside app/[locale]: only pages move there.
  A server action's arguments come from the browser, so each one is checked like any input.
*/

const emailSchema = z.string().trim().email()

/** Step 1: emails a 6-digit code to the address, creating the account on a first sign-in. */
export async function sendCode(email: string, locale: Locale): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'rate_limited' | 'send_failed' }> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const db = await supabaseProdServer()
  const { error } = await db.auth.signInWithOtp({
    email: normalizeEmail(parsed.data),
    // the code email's language: A-19's template switches on user_metadata.locale
    options: { shouldCreateUser: true, data: { locale: isLocale(locale) ? locale : DEFAULT_LOCALE } },
  })
  if (!error) return { ok: true }
  if (error.status === 429) return { ok: false, reason: 'rate_limited' }
  // a code that can't be sent locks people out: critical (spec §7.1, §11)
  reportError(error, { level: 'fatal', tags: { alert: 'sign-in' } })
  return { ok: false, reason: 'send_failed' }
}

/** Step 2: checks the code; when it is right, signs in and goes back to returnTo (same-site only). */
export async function verifyCode(email: string, code: string, returnTo?: string): Promise<{ ok: false; reason: 'wrong' | 'expired' } | never> {
  if (typeof email !== 'string' || typeof code !== 'string') return { ok: false, reason: 'wrong' }
  const db = await supabaseProdServer()
  const { error } = await db.auth.verifyOtp({ email: normalizeEmail(email), token: code, type: 'email' })
  if (error) return { ok: false, reason: /expired/i.test(error.message) ? 'expired' : 'wrong' }
  redirect(safeReturnTo(returnTo))
}
