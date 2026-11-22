import Link from 'next/link'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import type { PublicEvent } from '@/lib/events/types'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import { t, type StringKey } from '@/lib/i18n/t'

/**
 * The next event as a compact card at the foot of the hero wall (revision 04 §4.1): a date brick
 * (day and month), the label, the title as the card's one link, the weekday and time and the
 * department, and an arrow. The whole card is clickable.
 */
export function NextEventBrick({ event }: { event: PublicEvent | null }) {
  return (
    <aside
      data-testid="next-event"
      aria-labelledby="next-event-label"
      className="next-card group relative mt-(--mg) grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border-t-4 border-mint bg-deep-800 p-4 text-white lg:grid-cols-[5rem_minmax(0,1fr)_auto] lg:p-5"
    >
      {event ? (
        <>
          <p aria-hidden="true" className="grid aspect-square place-items-center content-center bg-teal text-center leading-[1.15]">
            <span className="block text-[1.875rem] font-bold">{formatRiyadh(event.startsAt, 'day')}</span>
            <span className="block text-label font-semibold text-mint-100">{formatRiyadh(event.startsAt, 'month')}</span>
          </p>
          <div className="min-w-0">
            <h2 id="next-event-label" className="text-label text-mint-200">{t('home.next.label')}</h2>
            <h3 className="mt-1 line-clamp-2 text-[1.0625rem] leading-[1.5] font-bold">
              <Link href={`/events/${event.id}`} className="text-white no-underline after:absolute after:inset-0">
                <span className="draw-line pb-0.5">{event.title}</span>
                <span className="sr-only">{t('a11y.when', { when: formatRiyadh(event.startsAt, 'datetime') })}</span>
              </Link>
            </h3>
            <p className="mt-1 truncate text-small text-on-dark">
              {formatRiyadh(event.startsAt, 'weekday')} · {formatRiyadhTimeRange(event.startsAt, event.endsAt)}
              {event.departmentCode && ` · ${t(`dept.${event.departmentCode}.title` as StringKey)}`}
            </p>
          </div>
          <span aria-hidden="true" className="next-go grid size-11 place-items-center border border-teal-300/50 text-mint">
            <ArrowGlyph size={20} />
          </span>
        </>
      ) : (
        <div className="col-span-3">
          <h2 id="next-event-label" className="text-label text-mint-200">{t('home.next.label')}</h2>
          <p className="mt-1 text-on-dark">{t('home.next.none')}</p>
        </div>
      )}
    </aside>
  )
}
