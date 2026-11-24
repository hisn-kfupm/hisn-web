import { EventList } from '@/components/EventList'
import { MonthGrid } from '@/components/MonthGrid'
import type { PublicEvent } from '@/lib/events/types'
import { EmptyMonth } from './EmptyMonth'
import { NEXT_EVENT_SIZES, NextEventBanner } from './NextEventBanner'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  month: string
  events: PublicEvent[]
  seatsLeft: Map<number, number | null>
  now: number
  /** the next upcoming event, featured at the top (loadCalendar) */
  next: PublicEvent | null
}

/**
 * The calendar's light band: the featured next event at the top (revision 04 §5), then the month
 * grid (md and up) and the day list (below md), or the empty month's short wall beside it.
 */
export function CalendarView({ locale, month, events, seatsLeft, now, next }: Props) {
  return (
    <section data-testid="calendar" className="bg-page pt-12 pb-20 lg:pt-16 lg:pb-28">
      <div className="wrap">
        {events.length === 0 ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-14">
            <EmptyMonth locale={locale} />
            {next && (
              // first on phones so the next event is at the top; beside the wall from lg
              <div className="order-first lg:order-none">
                <NextEventBanner locale={locale} event={next} month={month} sizes={NEXT_EVENT_SIZES.column} />
              </div>
            )}
          </div>
        ) : (
          <>
            {next && (
              <div className="mb-12 lg:mb-16">
                <NextEventBanner locale={locale} event={next} month={month} />
              </div>
            )}
            <MonthGrid locale={locale} month={month} events={events} seatsLeft={seatsLeft} now={now} />
            <EventList locale={locale} month={month} events={events} seatsLeft={seatsLeft} now={now} />
          </>
        )}
      </div>
    </section>
  )
}
