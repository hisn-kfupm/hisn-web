import { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { PageHead } from '@/components/brand/PageHead'
import { CalendarHead } from '@/components/calendar/CalendarHead'
import { CalendarView } from '@/components/calendar/CalendarView'
import { loadCalendar } from '@/lib/events/calendar'
import { groupByDay } from '@/lib/events/month'
import type { Locale } from '@/lib/i18n/locale'
import { localeOf } from '@/lib/i18n/page-locale'
import { t } from '@/lib/i18n/t'

/*
  /events, the calendar (dev-1 D1-10). Seat counts are live, so the page is rendered per request:
  dev-1 asks for `dynamic = 'force-dynamic'`, which Cache Components replaces with reading the
  request (searchParams) inside a Suspense boundary and leaving it uncached. ?m=YYYY-MM picks the
  month; anything else shows the current Riyadh month.
*/
type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: t(await localeOf(params), 'calendar.meta.title') }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function EventsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const locale = await localeOf(params)
  return (
    <Suspense fallback={<PageHead locale={locale} kicker={t(locale, 'nav.events')} size="display" title={t(locale, 'nav.events')} />}>
      <Calendar searchParams={searchParams} locale={locale} />
    </Suspense>
  )
}

async function Calendar({ searchParams, locale }: { searchParams: SearchParams; locale: Locale }) {
  const { m } = await searchParams
  // live seats and today's date: never part of a prerender or a runtime prefetch
  await connection()
  const now = new Date()
  const data = await loadCalendar(typeof m === 'string' ? m : undefined, now)
  return (
    <>
      <CalendarHead locale={locale} month={data.month} now={now.getTime()} count={data.events.length} eventDays={[...groupByDay(data.events).keys()]} />
      <CalendarView locale={locale} month={data.month} events={data.events} seatsLeft={data.seatsLeft} now={now.getTime()} next={data.next} />
    </>
  )
}
