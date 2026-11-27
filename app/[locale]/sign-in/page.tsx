/*
  Sign-in (dev-2 D2-5, spec §7.1): an email, then the 6-digit code sent to it, in the page's
  language. A right code returns to ?returnTo (same-site paths only, kept in this language);
  without one, to this language's homepage, so /en/sign-in returns to /en.
*/
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { signInReturnTo } from '@/lib/auth/return-to'
import { signInLabels } from '@/lib/auth/sign-in-labels'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'
import { alternatesFor } from '@/lib/i18n/alternates'
import { localeOf } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'
import { SignInForm } from './SignInForm'

type Params = Promise<{ locale: string }>
type SearchParams = Promise<{ returnTo?: string | string[] }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await localeOf(params)
  return { title: t(locale, 'auth.signIn'), robots: { index: false }, alternates: alternatesFor('/sign-in', locale) }
}

export default async function SignInPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const locale = await localeOf(params)
  return (
    <PageHead locale={locale} crumbs={[{ href: localePath(locale, '/'), label: t(locale, 'crumbs.home') }, { label: t(locale, 'auth.signIn') }]} kicker={t(locale, 'signin.kicker')} title={t(locale, 'auth.signIn')}>
      {/* ?returnTo is known only at request time */}
      <Suspense>
        <Form locale={locale} searchParams={searchParams} />
      </Suspense>
    </PageHead>
  )
}

async function Form({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  return <SignInForm locale={locale} returnTo={signInReturnTo((await searchParams).returnTo, locale)} labels={signInLabels(locale)} />
}
