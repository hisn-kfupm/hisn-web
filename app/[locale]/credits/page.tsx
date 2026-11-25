import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { CreditsList } from '@/components/credits/CreditsList'
import { parseCredits } from '@/lib/data/credits'
import { alternatesFor } from '@/lib/i18n/alternates'
import { localeOf } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'
import { localePath } from '@/lib/i18n/paths'

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await localeOf(params)
  return { title: t(locale, 'credits.title'), alternates: alternatesFor('/credits', locale) }
}

/*
  Read once, when the module loads at build, so the page is fully static: the credits change only
  with the photos, and that takes a deploy. The path is spelled out (it is CREDITS_FILE in
  lib/data/credits) so the file tracer includes only this file, not the whole project.
*/
const credits = parseCredits(readFileSync(join(process.cwd(), 'public', 'images', 'stand-in', 'CREDITS.md'), 'utf8'))

/**
 * The stand-in photos' credits, linked from the footer while the photos are in use (CC BY and
 * CC BY-SA ask for the credit to stay with the site). Remove the page and the footer link once
 * every photo is Hisn's own.
 */
export default async function CreditsPage({ params }: { params: Params }) {
  const locale = await localeOf(params)
  return (
    <>
      <PageHead locale={locale} crumbs={[{ href: localePath(locale, '/'), label: t(locale, 'crumbs.home') }, { label: t(locale, 'credits.title') }]} kicker={t(locale, 'credits.kicker')} title={t(locale, 'credits.title')}>
        <p className="mt-5 max-w-[36em] text-body text-on-dark">{t(locale, 'credits.intro')}</p>
      </PageHead>
      <section className="wrap pt-10 pb-20 lg:pt-14 lg:pb-28">
        <CreditsList credits={credits} locale={locale} />
      </section>
    </>
  )
}
