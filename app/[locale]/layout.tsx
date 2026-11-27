import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { plex } from '@/app/fonts'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ProgressHairline } from '@/components/ProgressHairline'
import { SkipLink } from '@/components/ui/SkipLink'
import { dirFor, isLocale, LOCALES } from '@/lib/i18n/locale'
import { localeOf } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'
import { ProfileGateProvider } from '@/lib/profile/gate'
import '../globals.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await localeOf(params)
  return {
    title: { default: t(locale, 'meta.title'), template: `%s · ${t(locale, 'meta.title')}` },
    description: t(locale, 'meta.description'),
  }
}

export const viewport: Viewport = { themeColor: '#022C33', colorScheme: 'light' }

/** /ar and /en are prerendered; any other first segment is not a page (dev-1 D1-1) */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/*
  The root layout of every public page (there is no app/layout.tsx): Arabic right to left at /ar,
  English left to right at /en, each with its own strings (t(locale, …) and en.json, D1-2). Shell (revision 04 §3): native scrolling, no smooth-scroll library and no motion
  provider (GSAP is imported only by the components that use it). The hairline is the
  scroll-progress bar, the header is fixed over the page (so every page starts with a dark head
  carrying data-band="dark"), and the footer sits in normal flow after main.
*/
export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <html lang={locale} dir={dirFor(locale)} data-scroll-behavior="smooth" className={plex.variable}>
      <body className="antialiased">
        <SkipLink locale={locale} />
        <ProgressHairline />
        {/* session is null until D2-4 (getSession) merges — dev-1 D1-5 stub */}
        <Header locale={locale} session={null} />
        <main id="main" tabIndex={-1} className="min-h-dvh outline-none">
          <ProfileGateProvider locale={locale}>{children}</ProfileGateProvider>
        </main>
        <Footer locale={locale} />
      </body>
    </html>
  )
}
