import Link from 'next/link'
import { Video } from 'lucide-react'
import { Courses } from '@/components/calendar/Courses'
import { StatusBadge } from '@/components/calendar/StatusBadge'
import { Icon } from '@/components/ui/Icon'
import { calendarStatus } from '@/lib/events/calendar-status'
import { buildMonthGrid, dayKeyOf, groupByDay, monthMidpoint, weekdayNames } from '@/lib/events/month'
import type { PublicEvent } from '@/lib/events/types'
import { fmtNum } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  /** 'YYYY-MM' */
  month: string
  /** the month's events, earliest first (eventsInMonth) */
  events: PublicEvent[]
  /** seats left by event id (getSeatsLeft); null or missing while unknown */
  seatsLeft: Map<number, number | null>
  /** the request's "now" in ms */
  now: number
}

const WEEKEND = new Set([5, 6]) // Friday and Saturday

/**
 * The calendar's month on md and up (dev-1 D1-10, redesign §6): a wall of day bricks in seven
 * columns, Sunday at the inline-start. Days outside the month are recessed, past days quieter,
 * Friday and Saturday tinted, today carries a mint square. Each event is a teal-edged brick with
 * its Riyadh time, title and department that lifts and fills with teal on hover or focus. Courses
 * (one per week) lay the wall again whenever the month changes.
 */
export function MonthGrid({ locale, month, events, seatsLeft, now }: Props) {
  const cells = buildMonthGrid(month)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const byDay = groupByDay(events)
  const today = dayKeyOf(now)
  const names = weekdayNames()
  const label = formatRiyadh(monthMidpoint(month), 'monthYear')

  return (
    <div data-testid="month-grid" className="hidden md:block">
      <h2 id="cal-grid-title" className="sr-only">{t(locale, 'calendar.grid.label', { month: label })}</h2>
      <div role="table" aria-labelledby="cal-grid-title" className="cal-wall">
        <div role="rowgroup">
          <div role="row" className="grid grid-cols-7 gap-[3px] pb-3">
            {names.map((name, i) => (
              <div key={name} role="columnheader" className={cn('flex items-center gap-2 text-label', WEEKEND.has(i) ? 'text-accent-strong' : 'text-deep')}>
                <i aria-hidden="true" className={cn('size-1.5 shrink-0', WEEKEND.has(i) ? 'bg-green' : 'bg-deep-200')} />
                {name}
              </div>
            ))}
          </div>
        </div>
        <Courses key={month} role="rowgroup" className="flex flex-col gap-[3px] border-t-2 border-deep pt-[3px]">
          {weeks.map((week) => (
            <div key={week[0]} role="row" data-week data-course-row className="grid grid-cols-7 gap-[3px]">
              {week.map((day, i) => (
                <DayCell locale={locale}
                  key={day}
                  day={day}
                  outside={!day.startsWith(month)}
                  weekend={WEEKEND.has(i)}
                  today={day === today}
                  past={day < today}
                  events={byDay.get(day) ?? []}
                  seatsLeft={seatsLeft}
                  now={now}
                />
              ))}
            </div>
          ))}
        </Courses>
      </div>
    </div>
  )
}

type CellProps = {
  locale: Locale
  day: string
  outside: boolean
  weekend: boolean
  today: boolean
  past: boolean
  events: PublicEvent[]
  seatsLeft: Map<number, number | null>
  now: number
}

function DayCell({ locale, day, outside, weekend, today, past, events, seatsLeft, now }: CellProps) {
  const n = Number(day.slice(8))
  return (
    <div
      role="cell"
      data-date={day}
      data-outside={outside || undefined}
      data-weekend={weekend || undefined}
      data-today={today || undefined}
      data-past={past || undefined}
      className="cal-day relative flex min-h-[9.75rem] flex-col gap-2 p-2.5 lg:min-h-[11rem] lg:p-3"
    >
      <p className="cal-num flex items-center gap-2 leading-none">
        <span className={cn('grid min-w-8 place-items-center text-[1.375rem] font-bold lg:text-[1.625rem]', today && 'size-10 bg-mint text-deep lg:size-11')}>
          {fmtNum(n, locale)}
        </span>
        {(n === 1 || today) && (
          <span className="text-label">{today ? t(locale, 'calendar.today') : formatRiyadh(`${day}T12:00:00.000Z`, 'month')}</span>
        )}
      </p>
      {events.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {events.map((e) => (
            <EventBrick locale={locale} key={e.id} event={e} left={seatsLeft.get(e.id) ?? null} now={now} />
          ))}
        </ul>
      )}
    </div>
  )
}

function EventBrick({ locale, event, left, now }: { locale: Locale; event: PublicEvent; left: number | null; now: number }) {
  const status = calendarStatus(event, left, now)
  const recording = status === 'ended' && event.recordingUrl !== null
  return (
    <li data-event={event.id} data-status={status} data-slot className="cal-ev relative">
      <span aria-hidden="true" className="cal-fill pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-1 py-2 ps-3 pe-2">
        <p className="cal-time text-[0.8125rem] leading-[1.3] font-semibold">{formatRiyadh(event.startsAt, 'time')}</p>
        <h3 className="cal-title line-clamp-3 text-[0.9375rem] leading-[1.5] font-bold">
          <Link href={`/events/${event.id}`} className="text-inherit no-underline after:absolute after:inset-0 after:z-10">
            {event.title}
            <span className="sr-only">{t(locale, 'a11y.when', { when: formatRiyadh(event.startsAt, 'datetime') })}</span>
          </Link>
        </h3>
        {event.departmentCode && (
          <p className="cal-dept text-[0.75rem] leading-[1.4] font-semibold">{t(locale, `dept.${event.departmentCode}.title` as StringKey)}</p>
        )}
        {(status !== 'open' || recording) && (
          <div className="mt-0.5 flex flex-col gap-0.5">
            <StatusBadge locale={locale} status={status} variant="flag" />
            {recording && (
              <span className="cal-flag inline-flex items-center gap-1 text-[0.75rem] leading-[1.45] font-semibold">
                <Icon icon={Video} size={13} />
                {t(locale, 'calendar.recording')}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
