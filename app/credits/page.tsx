import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { CreditsList } from '@/components/credits/CreditsList'
import { parseCredits } from '@/lib/data/credits'
import { t } from '@/lib/i18n/t'

export const metadata: Metadata = { title: t('credits.title') }

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
export default function CreditsPage() {
  return (
    <>
      <PageHead crumbs={[{ href: '/', label: t('crumbs.home') }, { label: t('credits.title') }]} kicker={t('credits.kicker')} title={t('credits.title')}>
        <p className="mt-5 max-w-[36em] text-body text-on-dark">{t('credits.intro')}</p>
      </PageHead>
      <section className="wrap pt-10 pb-20 lg:pt-14 lg:pb-28">
        <CreditsList credits={credits} />
      </section>
    </>
  )
}
