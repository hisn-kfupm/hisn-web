import { BattlementBand } from '@/components/brand/BattlementBand'
import { SectionMarks } from '@/components/brand/SectionMarks'
import { LinkButton } from '@/components/ui/Buttons'
import { majors } from '@/lib/data/labels'
import type { PublicEvent } from '@/lib/events/types'
import { pluralForms } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'
import { HeroMosaic } from './HeroMosaic'
import { HeroSearch } from './HeroSearch'
import { NextEventBrick } from './NextEventBrick'
import type { Locale } from '@/lib/i18n/locale'

/**
 * Home hero (revision 04 §4.1). A server component: copy on the inline-start, the wall on the
 * inline-end (under the copy on phones), so no text ever sits on the bricks. The slogan's «لبنة»
 * is the signature: the wall lays itself in course by course, then the mint brick drops into the
 * headline (CSS only, composed under reduced motion). One sentence says what Hisn is; the primary
 * action goes to the events and the major search is the second path. The next event is a compact
 * card at the foot of the wall. Strings are resolved here and passed to the client search.
 */
export function Hero({ locale, next }: { locale: Locale; next: PublicEvent | null }) {
  const slogan = t(locale, 'brand.slogan')
  const accent = t(locale, 'hero.accentWord')
  const at = slogan.indexOf(accent)
  const [before, after] = at < 0 ? [slogan, ''] : [slogan.slice(0, at).trim(), slogan.slice(at + accent.length).trim()]

  return (
    <section data-testid="hero" data-band="dark" aria-labelledby="hero-title" className="hero bg-brand on-dark relative z-10 overflow-x-clip text-white">
      <div className="wrap grid gap-x-10 gap-y-10 pt-[calc(var(--header-h)+1.75rem)] pb-[calc(var(--sq)+2.5rem)] lg:min-h-svh lg:grid-cols-12 lg:items-center lg:pt-[calc(var(--header-h)+2rem)] lg:pb-[calc(var(--sq)+2rem)]">
        <div data-hero-copy className="lg:col-span-7">
          <p className="mb-4 flex items-center gap-3 text-label text-on-dark lg:mb-5">
            <SectionMarks />
            {t(locale, 'brand.university')}
          </p>
          <h1 id="hero-title" className="hero-title text-[clamp(3rem,1.1rem+5.4vw,6.25rem)] leading-[1.22] font-bold">
            <span data-line className="block">
              {before}{' '}
              <span className="hero-brick relative inline-block px-[0.18em]">
                <span aria-hidden="true" className="hero-mint absolute inset-x-0 top-[0.1em] bottom-[0.02em] bg-mint" />
                <span aria-hidden="true" className="hero-dust" />
                <span className="hero-word relative">{accent}</span>
              </span>
            </span>{' '}
            {after && <span data-line className="block">{after}</span>}
          </h1>
          <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-[1.8] text-on-dark lg:mt-6 lg:text-[1.125rem]">{t(locale, 'brand.about')}</p>
          <div className="mt-7 flex flex-col items-start gap-7 lg:mt-8">
            <LinkButton href="/events" tone="dark" size="lg" arrow className="min-w-[14rem]">
              {t(locale, 'home.hero.primary')}
            </LinkButton>
            <HeroSearch locale={locale}
              majors={majors.filter((m) => m.code !== 'OTHER').map(({ code, ar, en }) => ({ code, ar, en }))}
              labels={{
                label: t(locale, 'hero.search.label'),
                placeholder: t(locale, 'hero.search.placeholder'),
                placeholderShort: t(locale, 'hero.search.placeholderShort'),
                clear: t(locale, 'hero.search.clear'),
                results: t(locale, 'hero.search.results'),
                counts: pluralForms(locale, 'hero.search.count'),
                found: t(locale, 'hero.found.status', { name: '{name}' }),
              }}
              foundLabels={{
                title: t(locale, 'hero.found.title'),
                events: t(locale, 'hero.found.events'),
                departments: t(locale, 'hero.found.departments'),
                close: t(locale, 'hero.found.close'),
              }}
            />
          </div>
        </div>
        <div className="flex flex-col lg:col-span-5">
          <HeroMosaic locale={locale} />
          <NextEventBrick locale={locale} event={next} />
        </div>
      </div>
      {/* the next band's light squares rise into the hero's foot */}
      <BattlementBand tone="page" edge="bottom" />
    </section>
  )
}
