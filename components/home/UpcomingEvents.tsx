import { SectionHead } from '@/components/brand/SectionHead'
import type { PublicEvent } from '@/lib/events/types'
import { t } from '@/lib/i18n/t'
import { EventPhotoCard } from './EventPhotoCard'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'

/**
 * «الفعاليات القادمة» (revision 04 §4.3): three photo cards and «كل الفعاليات». A row of three on
 * desktop; on phones and tablets a native snap row (swipe or scroll, no drag script).
 */
type Props = {
  locale: Locale
  number: number
  events: PublicEvent[]
  taken: Map<number, number>
  /** defaults: the homepage's title, «كل الفعاليات» link, empty text and test id */
  title?: string
  headId?: string
  link?: { href: string; label: string }
  emptyText?: string
  testId?: string
}

export function UpcomingEvents({ locale, number, events, taken, title, headId = 'upcoming-title', link, emptyText, testId = 'upcoming' }: Props) {
  return (
    <section data-testid={testId} aria-labelledby={headId} className="bg-box py-14 lg:py-20">
      <div className="wrap">
        <SectionHead locale={locale} number={number} id={headId} title={title ?? t(locale, 'home.events.title')} link={link ?? { href: localePath(locale, '/events'), label: t(locale, 'home.events.all') }} />
        {events.length > 0 ? (
          <ul className="snap-row m-0 list-none p-0 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-0">
            {events.map((event) => (
              <li key={event.id} data-card className="snap-item">
                <EventPhotoCard locale={locale} event={event} taken={taken.get(event.id) ?? null} sizes="(min-width: 1024px) 380px, (min-width: 640px) 360px, 82vw" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{emptyText ?? t(locale, 'home.events.none')}</p>
        )}
      </div>
    </section>
  )
}
