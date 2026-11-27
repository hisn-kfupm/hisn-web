import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Hero } from '@/components/hero/Hero'
import { DepartmentTiles } from '@/components/home/DepartmentTiles'
import { LatestRecordings } from '@/components/home/LatestRecordings'
import { TalentBand } from '@/components/home/TalentBand'
import { UpcomingEvents } from '@/components/home/UpcomingEvents'
import { WhatWeDo } from '@/components/home/WhatWeDo'
import { latestRecordings, upcomingEvents } from '@/lib/events/queries'
import { seatsTaken } from '@/lib/events/seats'
import type { Locale } from '@/lib/i18n/locale'
import { alternatesFor } from '@/lib/i18n/alternates'
import { localeOf } from '@/lib/i18n/page-locale'

/*
  Homepage (revision 04 §4), about five desktop screens. Bands, top to bottom: the hero (dark: the
  slogan, the primary action, the major search, the wall and the next event), what Hisn does
  (page), upcoming events (box), departments (deep), the latest recordings (page), the talent
  split band (page), then the footer in normal flow.

  The body is cached for an hour per language with 'use cache' + cacheLife('hours') (Cache
  Components rejects `export const revalidate`); the locale is its argument, so it is part of the
  cache key, and params are read outside the cached scope as the docs ask. The seat meters are therefore up to an hour old; the event page shows
  live seats. Admin saves can still refresh it: revalidatePath('/ar') and revalidatePath('/en')
  (there is no page at '/' since the move to app/[locale]).
*/
/** the layout gives the title and description; the homepage adds its language versions */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { alternates: alternatesFor('/', await localeOf(params)) }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  return bands(await localeOf(params))
}

/** the page's bands in one language, cached for an hour (the locale is the cache key) */
async function bands(locale: Locale) {
  'use cache'
  cacheLife('hours')

  const [upcoming, recordings] = await Promise.all([upcomingEvents({ limit: 3 }), latestRecordings({ limit: 4 })])
  const taken = await seatsTaken(upcoming.map((e) => e.id))

  return (
    <>
      <Hero locale={locale} next={upcoming[0] ?? null} />
      <WhatWeDo locale={locale} number={1} />
      <UpcomingEvents locale={locale} number={2} events={upcoming} taken={taken} />
      <DepartmentTiles locale={locale} number={3} />
      <LatestRecordings locale={locale} number={4} recordings={recordings} />
      <TalentBand locale={locale} />
    </>
  )
}
