import type { Metadata, Viewport } from 'next'
import { plex } from '@/app/fonts'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { NotFoundView } from '@/components/NotFoundView'
import { ProgressHairline } from '@/components/ProgressHairline'
import { SkipLink } from '@/components/ui/SkipLink'
import { t } from '@/lib/i18n/t'
import './globals.css'

// Next adds the noindex robots tag to every 404 itself, this page included
export const metadata: Metadata = { title: `${t('ar', 'notFound.title')} · ${t('ar', 'meta.title')}` }

// the same values as app/[locale]/layout.tsx: this page bypasses every layout
export const viewport: Viewport = { themeColor: '#022C33', colorScheme: 'light' }

/*
  The 404 document for an address that matches no route at all (dev-1 D1-1), served whole with a
  404 status (experimental.globalNotFound in next.config.ts). It gets no props, so it can't follow
  the address's language. Since D1-5, app/[locale]/[...rest] answers every unknown address under
  /ar and /en in its own language, so this is the safety net for the rest: '/' if its redirect to
  /ar ever went missing. An unknown first segment such as /fr or /admin/x matches [locale], so the
  layout's notFound() gives Next's default 404 there.
*/
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={plex.variable}>
      <body className="antialiased">
        <SkipLink locale="ar" />
        <ProgressHairline />
        <Header locale="ar" session={null} />
        <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
          <NotFoundView locale="ar" />
        </main>
        <Footer locale="ar" />
      </body>
    </html>
  )
}
