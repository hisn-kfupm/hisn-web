import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PageHead } from '@/components/brand/PageHead'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { Icon } from '@/components/ui/Icon'
import { buildMonthGrid, dayKeyOf, monthMidpoint, nextMonth, parseMonthParam, prevMonth } from '@/lib/events/month'
import { fmtNum } from '@/lib/i18n/number'
import { tp } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  month: string
  /** the request's "now" in ms */
  now: number
  /** events in the month */
  count: number
  /** the Riyadh days ('YYYY-MM-DD') that have an event, for the month's little wall */
  eventDays: string[]
}

const monthYear = (month: string, locale: Locale) => formatRiyadh(monthMidpoint(month), 'monthYear', locale)

/**
 * The calendar's dark head (redesign §6): the month set huge with its year, square previous and
 * next links that carry ?m=YYYY-MM, today as a small brick, and the month's count. The title is
 * keyed by month so it drops in again when the month changes (CSS only; composed without JS and
 * under reduced motion).
 */
export function CalendarHead({ locale, month, now, count, eventDays }: Props) {
  const current = parseMonthParam(undefined, new Date(now))
  const year = fmtNum(Number(month.slice(0, 4)), locale, { useGrouping: false })
  const nowIso = new Date(now).toISOString()
  const prev = prevMonth(month)
  const next = nextMonth(month)

  const todayInner = (
    <>
      <i aria-hidden="true" className="size-3 shrink-0 bg-mint" />
      <span className="text-label text-on-dark">{t(locale, 'calendar.today')}</span>
      <span className="font-semibold text-white">
        {formatRiyadh(nowIso, 'weekday', locale)} {formatRiyadh(nowIso, 'day', locale)} {formatRiyadh(nowIso, 'month', locale)}
      </span>
    </>
  )

  return (
    <PageHead locale={locale}
      crumbs={[{ href: '/', label: t(locale, 'crumbs.home') }, { label: t(locale, 'nav.events') }]}
      kicker={t(locale, 'nav.events')}
      size="display"
      title={
        <span key={month} className="cal-head-title flex flex-wrap items-end gap-x-5 lg:gap-x-8">
          <span className="text-hero" style={{ '--i': 0 } as React.CSSProperties}>{formatRiyadh(monthMidpoint(month), 'month', locale)}</span>{' '}
          <span className="pb-[0.4em] text-[clamp(1.75rem,1rem+2.6vw,3.75rem)] leading-[1.2] text-mint" style={{ '--i': 1 } as React.CSSProperties}>{year}</span>
        </span>
      }
    >
      <MonthGlyph key={month} month={month} today={dayKeyOf(now)} eventDays={new Set(eventDays)} />
      <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col items-start gap-4">
          {month === current ? (
            <p className="cal-today flex items-center gap-3 px-4 py-3">{todayInner}</p>
          ) : (
            <Link href={`/events?m=${current}`} scroll={false} className="cal-today group flex flex-wrap items-center gap-3 px-4 py-3 no-underline">
              {todayInner}
              <span className="flex items-center gap-1.5 text-label text-mint">
                <span className="draw-line pb-0.5">{t(locale, 'calendar.backToToday')}</span>
                <ArrowGlyph size={16} />
              </span>
            </Link>
          )}
          <p className="text-small text-on-dark">
            <span className="font-semibold text-white">{tp(locale, 'calendar.count', count)}</span>
            <span aria-hidden="true" className="mx-2 text-mint/60">■</span>
            {t(locale, 'calendar.timezone')}
          </p>
        </div>

        <nav aria-label={t(locale, 'calendar.nav')} className="flex items-center justify-between gap-6 sm:justify-start">
          <Link href={`/events?m=${prev}`} scroll={false} rel="prev" aria-label={t(locale, 'calendar.prev', { month: monthYear(prev, locale) })} data-month-link="prev" className="group flex items-center gap-3 text-white no-underline">
            <span className="btn btn-dark-secondary size-14 p-0">
              <Icon icon={ArrowLeft} mirror size={22} />
            </span>
            <span aria-hidden="true" className="text-[1.0625rem] font-semibold">{formatRiyadh(monthMidpoint(prev), 'month', locale)}</span>
          </Link>
          <i aria-hidden="true" className="h-8 w-px bg-white/20" />
          <Link href={`/events?m=${next}`} scroll={false} rel="next" aria-label={t(locale, 'calendar.next', { month: monthYear(next, locale) })} data-month-link="next" className="group flex items-center gap-3 text-white no-underline">
            <span aria-hidden="true" className="text-[1.0625rem] font-semibold">{formatRiyadh(monthMidpoint(next), 'month', locale)}</span>
            <span className="btn btn-dark-secondary size-14 p-0">
              <Icon icon={ArrowRight} mirror size={22} />
            </span>
          </Link>
        </nav>
      </div>
    </PageHead>
  )
}

/**
 * The month as a little wall in the head: one brick per day in the grid's seven columns, the days
 * with an event lit, today in mint. It lays itself again with the month (CSS, keyed by month).
 * Decorative: the grid and the list carry the same information.
 */
function MonthGlyph({ month, today, eventDays }: { month: string; today: string; eventDays: Set<string> }) {
  return (
    <div aria-hidden="true" className="cal-glyph mt-8 hidden grid-cols-7 gap-[3px] sm:inline-grid lg:absolute lg:end-8 lg:top-[calc(var(--header-h)+4.75rem)] lg:mt-0">
      {buildMonthGrid(month).map((day, i) => (
        <i
          key={day}
          data-on={eventDays.has(day) || undefined}
          data-today={day === today || undefined}
          data-outside={!day.startsWith(month) || undefined}
          className={cn('block h-3.5 w-7 lg:h-4 lg:w-9')}
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
