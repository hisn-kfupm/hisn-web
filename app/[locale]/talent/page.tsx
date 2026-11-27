import type { Metadata } from 'next'
import { PageHead } from '@/components/brand/PageHead'
import { SectionHead } from '@/components/brand/SectionHead'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { LinkButton } from '@/components/ui/Buttons'
import { images } from '@/lib/data/images'
import { fmtNum } from '@/lib/i18n/number'
import { alternatesFor } from '@/lib/i18n/alternates'
import { localeOf } from '@/lib/i18n/page-locale'
import { t, type StringKey } from '@/lib/i18n/t'
import { localePath } from '@/lib/i18n/paths'

/*
  /talent, the public half of dev-1 D1-17: what the talent base is, how to join, where the data
  rules live, and the «يفتح قريبًا» state. The form (TalentForm, SuccessScreen, resubmit and
  withdraw) waits for A-11 (fields, consent, TALENT_FORM_OPEN) and D2-7 (profile gate); this page
  renders no form element until then, which is dev-1's "flag off" case.
*/

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = await localeOf(params)
  return { title: t(locale, 'nav.talent'), alternates: alternatesFor('/talent', locale) }
}

const STEPS = [1, 2, 3] as const

export default async function TalentPage({ params }: { params: Params }) {
  const locale = await localeOf(params)
  return (
    <>
      <PageHead locale={locale} crumbs={[{ href: localePath(locale, '/'), label: t(locale, 'crumbs.home') }, { label: t(locale, 'nav.talent') }]} kicker={t(locale, 'nav.talent')} title={t(locale, 'home.talent.line')} photo={{ image: images.talent, alt: t(locale, images.talent.alt) }}>
        <p className="mt-5 max-w-[34em] text-body text-on-dark">{t(locale, 'home.talent.body')}</p>
      </PageHead>

      <section aria-labelledby="talent-what-title" className="bg-page py-14 lg:py-20">
        <div className="wrap grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <div>
            <SectionHead locale={locale} number={1} id="talent-what-title" title={t(locale, 'talent.what.title')} />
            <p className="max-w-[40em] text-[1.125rem] leading-[1.9]">{t(locale, 'talent.what.body')}</p>
          </div>
          <aside aria-labelledby="talent-privacy-title" className="border-t-4 border-mint bg-white p-6 lg:mt-24">
            <h3 id="talent-privacy-title" className="text-h3 text-deep">
              {t(locale, 'talent.privacy.title')}
            </h3>
            <p className="mt-3 text-muted">{t(locale, 'talent.privacy.body')}</p>
            <ArrowLink href={localePath(locale, '/privacy')} className="mt-5">
              {t(locale, 'talent.privacy.link')}
            </ArrowLink>
          </aside>
        </div>
      </section>

      <section aria-labelledby="talent-how-title" className="bg-box py-14 lg:py-20">
        <div className="wrap">
          <SectionHead locale={locale} number={2} id="talent-how-title" title={t(locale, 'talent.how.title')} />
          {/* three bricks stepping down toward the inline-end, like the logo's tower */}
          <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3 md:gap-6">
            {STEPS.map((n, i) => (
              <li key={n} className={`border-t-4 border-teal bg-white p-6 ${['', 'md:mt-10', 'md:mt-20'][i]}`}>
                <span aria-hidden="true" className="grid size-11 place-items-center bg-deep text-[1.25rem] font-bold text-mint">
                  {fmtNum(n, locale)}
                </span>
                <h3 className="mt-5 text-h3 text-deep">{t(locale, `talent.how.${n}.title` as StringKey)}</h3>
                <p className="mt-2 text-muted">{t(locale, `talent.how.${n}.body` as StringKey)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* D1-17: when A-11's TALENT_FORM_OPEN is true (and the consent text is final), TalentForm renders here instead */}
      <section aria-labelledby="talent-soon-title" data-band="dark" className="on-dark bg-deep py-14 text-white lg:py-20">
        <div className="wrap grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-label text-mint">{t(locale, 'nav.talent')}</p>
            <h2 id="talent-soon-title" className="mt-3 text-h1">
              {t(locale, 'talent.opensSoon')}
            </h2>
            <p className="mt-4 max-w-[36em] text-on-dark">{t(locale, 'talent.opensSoon.body')}</p>
            <LinkButton href={localePath(locale, '/events')} tone="dark" arrow className="mt-8">
              {t(locale, 'talent.opensSoon.cta')}
            </LinkButton>
          </div>
          <SocketWall />
        </div>
      </section>
    </>
  )
}

/** a short wall with one empty socket, the brick still to be laid (decoration) */
function SocketWall() {
  return (
    <div aria-hidden="true" className="socket-wall">
      {[0, 1, 2].map((row) => (
        <div key={row} className="socket-row">
          {[0, 1, 2, 3].map((col) => (
            <span key={col} className={row === 1 && col === 1 ? 'socket-brick is-empty' : 'socket-brick'} />
          ))}
        </div>
      ))}
    </div>
  )
}
