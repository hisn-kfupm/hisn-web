'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { PageHead } from '@/components/brand/PageHead'
import { RecoveryLinks } from '@/components/RecoveryLinks'
import { buttonClass } from '@/components/ui/button'
import { t } from '@/lib/i18n/t'

/** Arabic error page (dev-1 D1-5). Next 16.4 passes `retry` (not `reset`) and an `unknown` error. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <PageHead title={t('error.title')}>
        <p className="mt-4 max-w-[34rem] text-on-dark">{t('error.body')}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => retry()} className={buttonClass({ tone: 'dark' })}>{t('error.retry')}</button>
          <Link href="/" className={buttonClass({ variant: 'secondary', tone: 'dark' })}>{t('error.home')}</Link>
        </div>
      </PageHead>
      <section className="wrap pt-14">
        <RecoveryLinks />
      </section>
    </>
  )
}
