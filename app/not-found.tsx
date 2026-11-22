import Link from 'next/link'
import { PageHead } from '@/components/brand/PageHead'
import { RecoveryLinks } from '@/components/RecoveryLinks'
import { buttonClass } from '@/components/ui/button'
import { images } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'

/** Arabic 404 with the full header and footer around it (dev-1 D1-5): the missing piece, then ways back. */
export default function NotFound() {
  return (
    <>
      <PageHead figure={t('notFound.code')} title={t('notFound.title')} photo={{ image: images.notFound, alt: t(images.notFound.alt) }}>
        <p className="mt-4 max-w-[34rem] text-on-dark">{t('notFound.body')}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClass({ tone: 'dark' })}>{t('notFound.home')}</Link>
          <Link href="/events" className={buttonClass({ variant: 'secondary', tone: 'dark' })}>{t('notFound.events')}</Link>
        </div>
      </PageHead>
      <section className="wrap pt-14">
        <RecoveryLinks />
      </section>
    </>
  )
}
