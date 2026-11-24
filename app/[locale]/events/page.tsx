import { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { PageHead } from '@/components/brand/PageHead'
import { CalendarHead } from '@/components/calendar/CalendarHead'
import { CalendarView } from '@/components/calendar/CalendarView'
import { loadCalendar } from '@/lib/events/calendar'
import { groupByDay } from '@/lib/events/month'
import { t } from '@/lib/i18n/t'

/*
  /events, the calendar (dev-1 D1-10). Seat counts are live, so the page is rendered per request:
  dev-1 asks for `dynamic = 'force-dynamic'`, which Cache Components replaces with reading the
  request (searchParams) inside a Suspense boundary and leaving it uncached. ?m=YYYY-MM picks the
  month; anything else shows the current Riyadh month.
*/
export const metadata: Metadata = { title: t('calendar.meta.title') }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageHead kicker={t('nav.events')} size="display" title={t('nav.events')} />}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  )
}

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const { m } = await searchParams
  // live seats and today's date: never part of a prerender or a runtime prefetch
  await connection()
  const now = new Date()
  const data = await loadCalendar(typeof m === 'string' ? m : undefined, now)
  return (
    <>
      <CalendarHead month={data.month} now={now.getTime()} count={data.events.length} eventDays={[...groupByDay(data.events).keys()]} />
      <CalendarView month={data.month} events={data.events} seatsLeft={data.seatsLeft} now={now.getTime()} next={data.next} />
    </>
  )
}
