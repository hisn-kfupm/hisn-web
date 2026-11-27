import Link from 'next/link'
import { PageHead } from '@/components/brand/PageHead'
import { RecoveryLinks } from '@/components/RecoveryLinks'
import { buttonClass } from '@/components/ui/button'
import { images } from '@/lib/data/images'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'
import { t } from '@/lib/i18n/t'

/**
 * The 404 page's content (dev-1 D1-5): the missing piece, then ways back. app/[locale]/not-found.tsx
 * renders it in the page's language inside the site's header and footer; app/global-not-found.tsx
 * renders it in Arabic for addresses that match no route.
 */
export function NotFoundView({ locale }: { locale: Locale }) {
  return (
    <>
      <PageHead locale={locale} figure={t(locale, 'notFound.code')} title={t(locale, 'notFound.title')} photo={{ image: images.notFound, alt: t(locale, images.notFound.alt) }}>
        <p className="mt-4 max-w-[34rem] text-on-dark">{t(locale, 'notFound.body')}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={localePath(locale, '/')} className={buttonClass({ tone: 'dark' })}>{t(locale, 'notFound.home')}</Link>
          <Link href={localePath(locale, '/events')} className={buttonClass({ variant: 'secondary', tone: 'dark' })}>{t(locale, 'notFound.events')}</Link>
        </div>
      </PageHead>
      <section className="wrap pt-14">
        <RecoveryLinks locale={locale} />
      </section>
    </>
  )
}
