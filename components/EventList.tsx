import Link from 'next/link'
import { MapPin, Video } from 'lucide-react'
import { Place } from '@/components/Place'
import { StatusBadge } from '@/components/calendar/StatusBadge'
import { LayCourses } from '@/components/home/LayCourses'
import { Icon } from '@/components/ui/Icon'
import { Photo } from '@/components/ui/Photo'
import { SeatMeter } from '@/components/ui/SeatMeter'
import { eventCover } from '@/lib/data/images'
import { calendarStatus } from '@/lib/events/calendar-status'
import { dayKeyOf, groupByDay, monthMidpoint } from '@/lib/events/month'
import type { PublicEvent } from '@/lib/events/types'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import { cn } from '@/lib/cn'

type Props = {
  month: string
  events: PublicEvent[]
  seatsLeft: Map<number, number | null>
  now: number
}

/**
 * The calendar below md (dev-1 D1-10): the month's events grouped by Riyadh day, in the homepage
 * timetable's language (a huge day figure, the title and department, time, place, a seat meter
 * and the status badges), each row with a small thumbnail of the event cover (revision 04 §5).
 * LayCourses lays the days in and fills the meters.
 */
export function EventList({ month, events, seatsLeft, now }: Props) {
  const today = dayKeyOf(now)
  const days = [...groupByDay(events)]
  return (
    <section data-testid="event-list" aria-labelledby="cal-list-title" className="md:hidden">
      <h2 id="cal-list-title" className="sr-only">{t('calendar.list.label', { month: formatRiyadh(monthMidpoint(month), 'monthYear') })}</h2>
      <LayCourses key={month} className="timetable m-0 list-none border-t-2 border-deep p-0">
        {days.map(([day, list]) => {
          const first = list[0].startsAt
          const isToday = day === today
          const past = day < today
          return (
            <li key={day} data-course data-day-group={day} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-4 border-b border-line py-6">
              <h3 className="flex flex-col items-start">
                <span
                  data-day
                  className={cn(
                    'text-[3.5rem] leading-[1] font-bold',
                    isToday ? 'grid size-16 place-items-center bg-mint text-[2.5rem] text-deep' : past ? 'text-deep-300' : 'text-teal',
                  )}
                >
                  {formatRiyadh(first, 'day')}
                </span>
                <span className="mt-2 text-label text-deep">{isToday ? t('calendar.today') : formatRiyadh(first, 'weekday')}</span>
                <span className="text-label font-normal text-muted">{formatRiyadh(first, 'month')}</span>
              </h3>
              <ul className="m-0 flex min-w-0 list-none flex-col p-0">
                {list.map((e) => (
                  <ListRow key={e.id} event={e} left={seatsLeft.get(e.id) ?? null} now={now} />
                ))}
              </ul>
            </li>
          )
        })}
      </LayCourses>
    </section>
  )
}

function ListRow({ event, left, now }: { event: PublicEvent; left: number | null; now: number }) {
  const status = calendarStatus(event, left, now)
  const online = event.format === 'online'
  const quiet = status === 'ended' || status === 'cancelled'
  const meter = (status === 'open' || status === 'almostFull' || status === 'full') && event.capacity !== null && left !== null
  return (
    <li data-event={event.id} data-status={status} className="tt-row relative border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span aria-hidden="true" className="tt-fill pointer-events-none absolute -inset-x-3 inset-y-0 bg-teal" />
      {/* positioned, so the title link's ::after covers the thumbnail too */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_4.5rem] items-start gap-x-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          {event.departmentCode && <p className="tt-dept text-label text-accent-strong">{t(`dept.${event.departmentCode}.title` as StringKey)}</p>}
          <h4 className={cn('text-[1.125rem] leading-[1.5] font-bold', status === 'cancelled' && 'line-through decoration-2')}>
            <Link href={`/events/${event.id}`} className={cn('tt-ink no-underline after:absolute after:inset-0 after:z-10', quiet ? 'text-muted' : 'text-deep')}>
              {event.title}
              <span className="sr-only">{t('a11y.when', { when: formatRiyadh(event.startsAt, 'datetime') })}</span>
            </Link>
          </h4>
          <p className="tt-soft text-small text-muted">{formatRiyadhTimeRange(event.startsAt, event.endsAt)}</p>
          <p className="tt-soft flex items-start gap-1.5 text-small text-muted">
            <Icon icon={online ? Video : MapPin} size={16} className="mt-1" />
            <span>{online ? t('event.format.online') : event.location ? <Place text={event.location} /> : t('event.format.inPerson')}</span>
          </p>
          {(meter || status !== 'open') && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              {meter && <SeatMeter capacity={event.capacity as number} taken={(event.capacity as number) - (left as number)} className="tt-meter" />}
              {/* a full meter already reads «اكتملت المقاعد» */}
              {!(meter && status === 'full') && <StatusBadge status={status} />}
              {status === 'ended' && event.recordingUrl && (
                <span className="tt-ink inline-flex items-center gap-1.5 text-label text-teal">
                  <Icon icon={Video} size={16} />
                  {t('calendar.recording')}
                </span>
              )}
            </div>
          )}
        </div>
        <Photo image={eventCover(event)} alt="" ratio="1/1" sizes="72px" reveal={false} className={cn(quiet && 'opacity-55')} />
      </div>
    </li>
  )
}
