import type { Metadata } from 'next'
import { Bdi } from '@/components/Bdi'
import { PageHead } from '@/components/brand/PageHead'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import { TALENT_RETENTION_MONTHS } from '@/lib/config/retention'
import type { Locale } from '@/lib/i18n/locale'
import { fmtNum } from '@/lib/i18n/number'
import { localeOf } from '@/lib/i18n/page-locale'
import { t, type StringKey } from '@/lib/i18n/t'

/*
  /privacy, the page part of dev-1 D1-6 (the newsletter form is a separate piece). The exact text of
  spec §7.10 is not in this repo yet, so this is the structure only: every paragraph is a «مؤقت»
  placeholder that says the text is being prepared, and nothing here promises anything the spec has
  not. Paste §7.10 into the privacy.* keys when it arrives. The retention paragraph follows
  TALENT_RETENTION_MONTHS (null until the retention period is decided).
*/

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: t(await localeOf(params), 'privacy.title') }
}

const SECTIONS = ['collect', 'use', 'access', 'retention', 'rights', 'contact'] as const
type Section = (typeof SECTIONS)[number]

export default async function PrivacyPage({ params }: { params: Params }) {
  const locale = await localeOf(params)
  return (
    <>
      <PageHead locale={locale} crumbs={[{ href: '/', label: t(locale, 'crumbs.home') }, { label: t(locale, 'privacy.title') }]} kicker={t(locale, 'privacy.kicker')} title={t(locale, 'privacy.title')}>
        <p className="mt-5 max-w-[36em] text-body text-on-dark">{t(locale, 'privacy.intro')}</p>
      </PageHead>

      <div className="bg-page py-14 lg:py-20">
        <div className="wrap grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={t(locale, 'privacy.index')} className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
            <p className="text-label text-muted">{t(locale, 'privacy.index')}</p>
            <ol className="m-0 mt-4 list-none border-s-2 border-line p-0">
              {SECTIONS.map((s) => (
                <li key={s}>
                  <a href={`#privacy-${s}`} className="-ms-0.5 block border-s-2 border-transparent py-2 ps-4 text-deep no-underline hover:border-teal hover:text-teal">
                    {t(locale, `privacy.${s}.title` as StringKey)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="max-w-[44em]">
            {SECTIONS.map((s) => (
              <section key={s} id={`privacy-${s}`} aria-labelledby={`privacy-${s}-title`} className="scroll-mt-[calc(var(--header-h)+1.5rem)] border-t border-line py-8 first:border-t-0 first:pt-0">
                <h2 id={`privacy-${s}-title`} className="text-h2 text-deep">
                  {t(locale, `privacy.${s}.title` as StringKey)}
                </h2>
                <div className="mt-4 text-[1.0625rem] leading-[1.9]">
                  <SectionBody section={s} locale={locale} />
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </>
  )
}

function SectionBody({ section, locale }: { section: Section; locale: Locale }) {
  if (section === 'retention') {
    return <p>{TALENT_RETENTION_MONTHS === null ? t(locale, 'privacy.retention.unset') : t(locale, 'privacy.retention.set', { months: fmtNum(TALENT_RETENTION_MONTHS, locale) })}</p>
  }
  if (section === 'contact') {
    return (
      <p>
        {t(locale, 'privacy.contact.body')}{' '}
        <Bdi lang="en">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-teal">
            {CONTACT_EMAIL}
          </a>
        </Bdi>
      </p>
    )
  }
  return <p className="text-muted">{t(locale, 'privacy.pending')}</p>
}
