import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { plex } from '@/app/fonts'
import { Logo } from '@/components/brand/Logo'
import { SkipLink } from '@/components/ui/SkipLink'
import { requireAdmin } from '@/lib/admin/require-admin'
import { t } from '@/lib/i18n/t'
import '../globals.css'

export const metadata: Metadata = {
  title: { default: t('ar', 'admin.area'), template: `%s · ${t('ar', 'admin.area')}` },
  robots: { index: false, follow: false },
}

/*
  The guard below reads the visitor's session, so the admin can't be a static shell, and it must
  answer before anything renders (a real redirect, no flash of the page). instant = false lets the
  admin block on the server; Cache Components would otherwise reject the request read outside
  <Suspense> (Next docs: Authentication with Cache Components).
*/
export const instant = false

/**
 * The admin's own root layout (dev-1 D1-1, D1-13): Arabic only, right to left, outside the locale
 * segment. requireAdmin() runs first; each page and server action calls it again, because a layout
 * doesn't run on navigation between its pages.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="min-h-dvh bg-page text-text antialiased">
        <SkipLink locale="ar" />
        <header data-band="dark" className="on-dark bg-deep-600 text-on-dark">
          <div className="wrap flex h-16 items-center gap-4">
            <Link href="/admin" aria-label={t('ar', 'admin.home')} className="shrink-0">
              <Logo tone="reversed" height={34} idPrefix="admin" />
            </Link>
            <span className="border-s border-white/20 ps-4 text-label text-mint">{t('ar', 'admin.area')}</span>
            <Link href="/ar" className="ms-auto inline-flex min-h-11 items-center text-small font-semibold text-white">
              <span className="draw-line pb-0.5">{t('ar', 'admin.toSite')}</span>
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="wrap py-10 outline-none lg:py-14">
          {children}
        </main>
      </body>
    </html>
  )
}
