import type { Metadata, Viewport } from 'next'
import { plex } from '@/app/fonts'
import NotFound from '@/app/[locale]/not-found'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ProgressHairline } from '@/components/ProgressHairline'
import { SkipLink } from '@/components/ui/SkipLink'
import { t } from '@/lib/i18n/t'
import './globals.css'

// Next adds the noindex robots tag to every 404 itself, this page included
export const metadata: Metadata = { title: `${t('notFound.title')} · ${t('meta.title')}` }

// the same values as app/[locale]/layout.tsx: this page bypasses every layout
export const viewport: Viewport = { themeColor: '#022C33', colorScheme: 'light' }

/*
  Interim 404 for /ar and /en addresses that match no route, such as /ar/nope or
  /ar/events/1/extra (dev-1 D1-1). With the root layout under app/[locale] there is no
  app/layout.tsx to wrap app/[locale]/not-found.tsx for them, so Next serves this whole document
  instead, with a 404 status (experimental.globalNotFound in next.config.ts). It gets no props, so
  it can't follow the address's language: it is Arabic until D1-5's app/[locale]/[...rest] page
  takes these addresses (then delete this file and the flag, or keep them for stray paths). An
  unknown first segment such as /fr or /admin matches [locale], so the layout's notFound() gives
  Next's default 404 there. notFound() inside a page still renders app/[locale]/not-found.tsx.
*/
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={plex.variable}>
      <body className="antialiased">
        <SkipLink />
        <ProgressHairline />
        <Header session={null} />
        <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
          <NotFound />
        </main>
        <Footer />
      </body>
    </html>
  )
}
