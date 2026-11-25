'use server'
import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'

/*
  STAND-IN for signOut(locale) from lib/auth/session.ts (auth is D2-4, Abdullah). There is no
  session to end yet, so it only does the second half: back to the homepage in the same language
  (unknown → /ar). The header's account menu calls it; that menu shows only with a session, which
  the layout passes as null until D2-4. Then switch the import in components/AccountMenu.tsx (and
  the mock in tests/unit/header.test.tsx) to '@/lib/auth/session' and delete this file.
*/
export async function signOut(locale: Locale): Promise<void> {
  // a server action's argument comes from the browser, so it is checked like any input
  redirect(localePath(isLocale(String(locale)) ? locale : DEFAULT_LOCALE, '/'))
}
