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
import { t } from '@/lib/i18n/t'

export const metadata: Metadata = { title: t('auth.signIn'), robots: { index: false } }

type SearchParams = Promise<{ returnTo?: string | string[] }>

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageHead crumbs={[{ href: '/', label: t('crumbs.home') }, { label: t('auth.signIn') }]} kicker={t('signin.kicker')} title={t('auth.signIn')}>
      <p className="mt-5 max-w-[34em] text-body text-on-dark">{t('signin.body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Suspense
          fallback={
            <LinkButton href="/" tone="dark" arrow>
              {t('signin.home')}
            </LinkButton>
          }
        >
          <BackLinks searchParams={searchParams} />
        </Suspense>
      </div>
    </PageHead>
  )
}

async function BackLinks({ searchParams }: { searchParams: SearchParams }) {
  const target = safeReturnTo((await searchParams).returnTo)
  if (target === '/') {
    return (
      <LinkButton href="/" tone="dark" arrow>
        {t('signin.home')}
      </LinkButton>
    )
  }
  return (
    <>
      <LinkButton href={target} tone="dark" arrow>
        {t('signin.back')}
      </LinkButton>
      <LinkButton href="/" variant="secondary" tone="dark">
        {t('signin.home')}
      </LinkButton>
    </>
  )
}
