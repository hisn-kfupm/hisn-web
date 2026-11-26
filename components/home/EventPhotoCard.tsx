import Link from 'next/link'
import { MapPin, Video } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Photo } from '@/components/ui/Photo'
import { SeatMeter } from '@/components/ui/SeatMeter'
import { eventCover } from '@/lib/data/images'
import { isAlmostFull } from '@/lib/events/almost-full'
import type { PublicEvent } from '@/lib/events/types'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import { t, type StringKey } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  event: PublicEvent
  /** seats taken (lib/events/seats.ts); null hides the meter */
  taken: number | null
  /** next/image sizes for the cover at this card's width */
  sizes: string
}

/**
 * The site's one event card (revision 04 §1.5: image → meta → title → action): the cover photo
 * with a date brick in its inline-start corner, the department, the title (the card's one link,
 * stretched over the whole card), format and time, and the seat meter. The cover is a stand-in
 * that does not show this event, so it carries no alt text; the title says what the card is.
 */
export function EventPhotoCard({ locale, event, taken, sizes }: Props) {
  const online = event.format === 'online'
  const left = event.capacity !== null && taken !== null ? Math.max(0, event.capacity - taken) : null
  return (
    <article className="ev-card group relative flex h-full flex-col bg-white">
      <div className="relative">
        <Photo image={eventCover(event)} alt="" ratio="16/9" sizes={sizes} />
        <p aria-hidden="true" className="absolute start-0 bottom-0 z-10 grid min-w-16 place-items-center bg-deep px-3 py-2 text-center leading-[1.15] text-white">
          <span className="block text-[1.625rem] font-bold">{formatRiyadh(event.startsAt, 'day', locale)}</span>
          <span className="block text-label font-semibold text-mint-200">{formatRiyadh(event.startsAt, 'month', locale)}</span>
        </p>
      </div>
      <div className="flex flex-1 flex-col border-t-4 border-teal p-5">
        {event.departmentCode && <p className="text-label text-accent-strong">{t(locale, `dept.${event.departmentCode}.title` as StringKey)}</p>}
        <h3 className="mt-1.5 line-clamp-2 text-[1.1875rem] leading-[1.5] font-bold">
          <Link href={`/events/${event.id}`} className="text-deep no-underline after:absolute after:inset-0 after:z-20">
            <span className="draw-line pb-0.5">{event.title}</span>
            <span className="sr-only">{t(locale, 'a11y.when', { when: formatRiyadh(event.startsAt, 'datetime', locale) })}</span>
          </Link>
        </h3>
        <p className="mt-2 flex items-center gap-2 text-small text-muted">
          <Icon icon={online ? Video : MapPin} size={16} className="shrink-0 text-teal" />
          <span>
            {t(locale, online ? 'event.format.online' : 'event.format.inPerson')} · {formatRiyadh(event.startsAt, 'weekday', locale)} {formatRiyadhTimeRange(event.startsAt, event.endsAt, locale)}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-5">
          {event.capacity !== null && taken !== null ? (
            <>
              <SeatMeter locale={locale} capacity={event.capacity} taken={taken} />
              {isAlmostFull(event.capacity, left) && (
                <span className="inline-flex items-center gap-1.5 text-label text-accent-strong">
                  <i aria-hidden="true" className="size-2 bg-green" />
                  {t(locale, 'event.badge.almostFull')}
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-2 text-small font-semibold text-deep">
              <i aria-hidden="true" className="size-2 bg-green" />
              {t(locale, 'event.seats.open')}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
