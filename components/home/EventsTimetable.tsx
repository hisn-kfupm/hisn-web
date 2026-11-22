import Link from 'next/link'
import { MapPin, Video } from 'lucide-react'
import { Place } from '@/components/Place'
import { SectionHead } from '@/components/brand/SectionHead'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { Icon } from '@/components/ui/Icon'
import { SeatMeter } from '@/components/ui/SeatMeter'
import { isAlmostFull } from '@/lib/events/almost-full'
import type { PublicEvent } from '@/lib/events/types'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import { t, type StringKey } from '@/lib/i18n/t'
import { LayCourses } from './LayCourses'

type Props = {
  number: number
  events: PublicEvent[]
  /** seats taken by event id (lib/events/seats.ts); events without an entry show no meter */
  taken: Map<number, number>
  /** section title (default «الفعاليات القادمة») */
  title?: string
  /** band colour: the default page, or box when it follows another light band */
  className?: string
}

/**
 * «الفعاليات القادمة» as an editorial timetable (redesign §5.4), not cards: one full-width row per
 * event with the day as a huge figure, month and weekday, title and department, format and place,
 * a seat meter and an arrow. Hovering or focusing a row fills it with teal from the inline-start.
 * LayCourses lays the rows in one by one and fills their meters. Reusable on department pages.
 */
export function EventsTimetable({ number, events, taken, title, className = 'bg-page' }: Props) {
  return (
    <section data-testid="upcoming" aria-labelledby="upcoming-title" className={`${className} pt-16 pb-20 lg:pt-24 lg:pb-28`}>
      <div className="wrap">
        <SectionHead number={number} id="upcoming-title" title={title ?? t('home.events.title')} />
        {events.length > 0 ? (
          <LayCourses className="timetable m-0 list-none border-t-2 border-deep p-0">
            {events.map((event) => (
              <TimetableRow key={event.id} event={event} taken={taken.get(event.id) ?? null} />
            ))}
          </LayCourses>
        ) : (
          <p className="border-t-2 border-deep pt-6 text-muted">{t('home.events.none')}</p>
        )}
        <Link
          href="/events"
          className="tt-all group relative mt-0 flex min-h-20 items-center justify-between gap-6 border-b border-line py-5 text-[clamp(1.375rem,1rem+1.5vw,2.25rem)] font-bold text-teal no-underline"
        >
          <span className="draw-line pb-1">{t('home.events.all')}</span>
          <span className="tt-arrow grid size-12 shrink-0 place-items-center bg-teal text-white lg:size-14">
            <ArrowGlyph size={24} />
          </span>
        </Link>
      </div>
    </section>
  )
}

function TimetableRow({ event, taken }: { event: PublicEvent; taken: number | null }) {
  const online = event.format === 'online'
  const left = event.capacity !== null && taken !== null ? Math.max(0, event.capacity - taken) : null
  return (
    <li data-course className="tt-row group relative border-b border-line">
      <article className="relative grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 sm:grid-cols-[6.5rem_minmax(0,1fr)] lg:grid-cols-[13.5rem_minmax(0,1fr)_13rem_14.5rem_3.5rem] lg:items-center lg:gap-x-8 lg:py-7">
        <span aria-hidden="true" className="tt-fill pointer-events-none absolute -inset-x-3 inset-y-0 bg-teal lg:-inset-x-5" />
        <div aria-hidden="true" className="relative row-span-3 flex flex-col items-start lg:row-span-1 lg:flex-row lg:items-center lg:gap-4">
          <span data-day className="tt-day tt-ink text-[3.75rem] leading-[1] font-bold text-teal sm:text-[4.75rem] lg:text-[6.25rem]">
            {formatRiyadh(event.startsAt, 'day')}
          </span>
          <span className="mt-1 flex flex-col leading-[1.35] lg:mt-0">
            <span className="tt-ink text-[0.9375rem] font-semibold text-deep lg:text-[1.125rem]">{formatRiyadh(event.startsAt, 'month')}</span>
            <span className="tt-soft text-label font-normal text-muted">{formatRiyadh(event.startsAt, 'weekday')}</span>
          </span>
        </div>
        <div className="relative min-w-0">
          {event.departmentCode && (
            <p className="tt-dept mb-1.5 text-label text-accent-strong">{t(`dept.${event.departmentCode}.title` as StringKey)}</p>
          )}
          <h3 className="text-[1.1875rem] leading-[1.5] font-bold lg:text-[1.5rem] lg:leading-[1.45]">
            <Link href={`/events/${event.id}`} className="tt-ink text-deep no-underline after:absolute after:inset-0 after:z-10">
              {event.title}
              <span className="sr-only">{t('a11y.when', { when: formatRiyadh(event.startsAt, 'datetime') })}</span>
            </Link>
          </h3>
          <p className="tt-soft mt-1 text-small text-muted">{formatRiyadhTimeRange(event.startsAt, event.endsAt)}</p>
        </div>
        <p className="tt-soft relative flex items-start gap-2 text-small text-muted lg:text-body">
          <Icon icon={online ? Video : MapPin} size={18} className="mt-1" />
          <span>
            <span className="tt-ink block font-semibold text-deep">{t(online ? 'event.format.online' : 'event.format.inPerson')}</span>
            {!online && event.location && <Place text={event.location} />}
          </span>
        </p>
        <div className="relative flex flex-col items-start gap-2">
          {event.capacity !== null && taken !== null ? (
            <>
              <SeatMeter capacity={event.capacity} taken={taken} className="tt-meter" />
              {isAlmostFull(event.capacity, left) && (
                <span className="tt-hot inline-flex items-center gap-1.5 text-label text-accent-strong">
                  <i aria-hidden="true" className="size-2 bg-green" />
                  {t('event.badge.almostFull')}
                </span>
              )}
            </>
          ) : (
            <span className="tt-ink inline-flex items-center gap-2 text-small font-semibold text-deep">
              <i aria-hidden="true" className="size-2 bg-green" />
              {t('event.seats.open')}
            </span>
          )}
        </div>
        <span aria-hidden="true" className="tt-arrow relative hidden size-14 place-items-center border border-teal text-teal lg:grid">
          <ArrowGlyph size={24} />
        </span>
      </article>
    </li>
  )
}
