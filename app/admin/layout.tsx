import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { plex } from '@/app/fonts'
import { t } from '@/lib/i18n/t'
import '../globals.css'

export const metadata: Metadata = { title: t('meta.title'), robots: { index: false, follow: false } }

/**
 * The admin's own root layout (dev-1 D1-1): Arabic only, right to left, outside the locale
 * segment. Its pages, and their navigation, come with D1-13 onwards.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
