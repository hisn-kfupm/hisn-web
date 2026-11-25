/*
  PLACEHOLDER until the auth task (D2-4, Abdullah) replaces this file with the real sign-in: a
  6-digit code sent to the university email, 10-minute expiry, resend after 60 s. Until then the
  header's «تسجيل الدخول» and every "sign in to register" link land on this holding page instead of
  a 404. It keeps ?returnTo (same-site paths only, lib/auth/return-to) for the back link.
*/
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { LinkButton } from '@/components/ui/Buttons'
import { safeReturnTo } from '@/lib/auth/return-to'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'
import { alternatesFor } from '@/lib/i18n/alternates'
import { localeOf } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await localeOf(params)
  return { title: t(locale, 'auth.signIn'), robots: { index: false }, alternates: alternatesFor('/sign-in', locale) }
}

type SearchParams = Promise<{ returnTo?: string | string[] }>

export default async function SignInPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const locale = await localeOf(params)
  return (
    <PageHead locale={locale} crumbs={[{ href: localePath(locale, '/'), label: t(locale, 'crumbs.home') }, { label: t(locale, 'auth.signIn') }]} kicker={t(locale, 'signin.kicker')} title={t(locale, 'auth.signIn')}>
      <p className="mt-5 max-w-[34em] text-body text-on-dark">{t(locale, 'signin.body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Suspense
          fallback={
            <LinkButton href={localePath(locale, '/')} tone="dark" arrow>
              {t(locale, 'signin.home')}
            </LinkButton>
          }
        >
          <BackLinks searchParams={searchParams} locale={locale} />
        </Suspense>
      </div>
    </PageHead>
  )
}

async function BackLinks({ searchParams, locale }: { searchParams: SearchParams; locale: Locale }) {
  const target = safeReturnTo((await searchParams).returnTo)
  if (target === '/') {
    return (
      <LinkButton href={localePath(locale, '/')} tone="dark" arrow>
        {t(locale, 'signin.home')}
      </LinkButton>
    )
  }
  return (
    <>
      <LinkButton href={target} tone="dark" arrow>
        {t(locale, 'signin.back')}
      </LinkButton>
      <LinkButton href={localePath(locale, '/')} variant="secondary" tone="dark">
        {t(locale, 'signin.home')}
      </LinkButton>
    </>
  )
}
