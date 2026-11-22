import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { LibraryBody, LibraryFallback, loadLibrary } from '@/components/library/LibraryBody'
import { images } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'
import { tp } from '@/lib/i18n/plural'

/*
  /library (dev-1 D1-12): recordings of ended events, newest first, filtered by department with
  ?d=<CODE>; each card plays in place and only one plays at a time. The head (with the total count)
  is static; the filter and the grid read the request, so they sit in <Suspense>. When
  LIBRARY_REQUIRES_SIGN_IN is on, a signed-out visitor is sent to /sign-in?returnTo=/library.
*/

export const metadata: Metadata = { title: t('nav.library') }

type SearchParams = Promise<{ d?: string | string[] }>

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const { all } = await loadLibrary(null)
  return (
    <>
      <PageHead crumbs={[{ href: '/', label: t('crumbs.home') }, { label: t('nav.library') }]} kicker={t('library.kicker')} title={t('nav.library')} photo={{ image: images.library, alt: t(images.library.alt) }}>
        <p className="mt-5 max-w-[34em] text-body text-on-dark">{t('library.intro')}</p>
        <p className="mt-6 inline-flex items-center gap-3 border-s-4 border-mint ps-4 text-h3 text-white">{tp('library.count', all.length)}</p>
      </PageHead>
      <Suspense fallback={<LibraryFallback />}>
        <LibraryBody searchParams={searchParams} />
      </Suspense>
    </>
  )
}
