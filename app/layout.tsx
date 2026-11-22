import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ProgressHairline } from '@/components/ProgressHairline'
import { SkipLink } from '@/components/ui/SkipLink'
import { t } from '@/lib/i18n/t'
import './globals.css'

/*
  dev-1 D1-1 loads 400/500/700 and preloads arabic + latin. Changed in D1-5 (discovery §5 #4, §8):
  600 is the guide's weight for H3, labels and department names; only the Arabic subset is
  preloaded — Latin still loads on demand, and Plex Arabic's Latin matches IBM Plex Sans.
*/
const plex = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: t('meta.title'), template: `%s · ${t('meta.title')}` },
  description: t('meta.description'),
}

export const viewport: Viewport = { themeColor: '#022C33', colorScheme: 'light' }

/*
  Shell (revision 04 §3): native scrolling, no smooth-scroll library and no motion provider (GSAP
  is imported only by the components that use it). The hairline is the scroll-progress bar, the
  header is fixed over the page (so every page starts with a dark head carrying data-band="dark"),
  and the footer sits in normal flow after main.
*/
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={plex.variable}>
      <body className="antialiased">
        <SkipLink />
        <ProgressHairline />
        {/* session is null until D2-4 (getSession) merges — dev-1 D1-5 stub */}
        <Header session={null} />
        <main id="main" tabIndex={-1} className="min-h-dvh outline-none">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
