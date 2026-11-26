import Link from 'next/link'
import { SectionMarks } from '@/components/brand/SectionMarks'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Photo } from '@/components/ui/Photo'
import { eventCover } from '@/lib/data/images'
import type { PublicEvent } from '@/lib/events/types'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh, riyadhMonth } from '@/lib/time/riyadh'
import type { Locale } from '@/lib/i18n/locale'

/**
 * The photo's rendered width in each CalendarView layout. The card goes side by side once it is
 * 56rem wide, which a full-width card reaches at a 966px viewport (wrap = 100vw − 64px, minus the
 * 6px mint edge); in an empty month it sits in the 5fr column from lg up and stays stacked.
 */
export const NEXT_EVENT_SIZES = {
  full: '(min-width: 966px) 352px, 100vw',
  column: '(min-width: 1280px) 472px, (min-width: 1024px) 372px, (min-width: 966px) 352px, 100vw',
}

/**
 * The featured next event at the top of /events (dev-1 D1-10's banner, revision 04 §5): a raised
 * deep brick with a mint edge on the inline-start and the event's cover photo, above the text until
 * the card is 56rem wide and beside it from then on. The whole card links to the event; when the
 * event falls in another month than the one on screen, a second link opens that month.
 */
export function NextEventBanner({ locale, event, month, sizes = NEXT_EVENT_SIZES.full }: { locale: Locale; event: PublicEvent; month: string; sizes?: string }) {
  const eventMonth = riyadhMonth(event.startsAt)
  return (
    <aside data-testid="next-banner" aria-labelledby="next-banner-title" className="cal-banner group relative @container text-white">
      <div className="grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="relative @4xl:order-2">
          <Photo
            image={eventCover(event)}
            alt=""
            ratio="16/9"
            sizes={sizes}
            tone="dark"
            priority
            reveal={false}
            // beside the text the photo fills its cell: a definite width as well as the height, or
            // its 16/9 ratio would widen it past the card
            className="@4xl:size-full"
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-4 py-6 ps-6 pe-5 sm:gap-x-8 sm:py-8 sm:ps-9 sm:pe-8">
          <div className="min-w-0">
            <p className="mb-3 flex items-center gap-3 text-label text-on-dark">
              <SectionMarks />
              {t(locale, 'calendar.nextEvent')}
            </p>
            <h2 id="next-banner-title" className="text-[1.375rem] leading-[1.45] font-bold sm:text-[1.875rem] sm:leading-[1.4]">
              {/* the link's ::after covers the whole card, photo and arrow included; its own z-index
                  keeps it above the reordered photo whatever the engine's paint order */}
              <Link href={`/events/${event.id}`} className="text-white no-underline after:absolute after:inset-0 after:z-[1]">
                {event.title}
              </Link>
            </h2>
            <p className="mt-2 text-small text-on-dark sm:text-body">
              {t(locale, 'event.weekdayDate', { weekday: formatRiyadh(event.startsAt, 'weekday', locale), date: formatRiyadh(event.startsAt, 'date', locale) })}
              <span aria-hidden="true" className="mx-2 text-mint/60">■</span>
              {formatRiyadh(event.startsAt, 'time', locale)}
              {event.departmentCode && (
                <>
                  <span aria-hidden="true" className="mx-2 text-mint/60">■</span>
                  <span className="font-semibold text-mint">{t(locale, `dept.${event.departmentCode}.title` as StringKey)}</span>
                </>
              )}
            </p>
          </div>
          <div aria-hidden="true" className="flex flex-col items-center self-start sm:self-center">
            <span className="text-[3.25rem] leading-[1] font-bold text-mint sm:text-[5rem]">{formatRiyadh(event.startsAt, 'day', locale)}</span>
            <span className="mt-1 text-label text-on-dark">{formatRiyadh(event.startsAt, 'month', locale)}</span>
          </div>
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-4 border-t border-white/12 pt-4">
            {eventMonth !== month && (
              <ArrowLink href={`/events?m=${eventMonth}`} scroll={false} tone="dark" className="relative z-10">
                {t(locale, 'calendar.nextEvent.month', { month: formatRiyadh(event.startsAt, 'month', locale) })}
              </ArrowLink>
            )}
            <span aria-hidden="true" className="cal-banner-go ms-auto grid size-12 place-items-center bg-mint text-deep">
              <ArrowGlyph size={22} />
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
