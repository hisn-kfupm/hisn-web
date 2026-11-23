import { cacheLife } from 'next/cache'
import { Hero } from '@/components/hero/Hero'
import { DepartmentTiles } from '@/components/home/DepartmentTiles'
import { LatestRecordings } from '@/components/home/LatestRecordings'
import { TalentBand } from '@/components/home/TalentBand'
import { UpcomingEvents } from '@/components/home/UpcomingEvents'
import { WhatWeDo } from '@/components/home/WhatWeDo'
import { latestRecordings, upcomingEvents } from '@/lib/events/queries'
import { seatsTaken } from '@/lib/events/seats'

/*
  Homepage (revision 04 §4), about five desktop screens. Bands, top to bottom: the hero (dark: the
  slogan, the primary action, the major search, the wall and the next event), what Hisn does
  (page), upcoming events (box), departments (deep), the latest recordings (page), the talent
  split band (page), then the footer in normal flow.

  Cached for an hour with 'use cache' + cacheLife('hours') (Cache Components rejects
  `export const revalidate`). The seat meters are therefore up to an hour old; the event page shows
  live seats. Admin saves can still refresh it: revalidatePath('/ar') and revalidatePath('/en')
  (there is no page at '/' since the move to app/[locale]).
*/
export default async function Home() {
  'use cache'
  cacheLife('hours')

  const [upcoming, recordings] = await Promise.all([upcomingEvents({ limit: 3 }), latestRecordings({ limit: 4 })])
  const taken = await seatsTaken(upcoming.map((e) => e.id))

  return (
    <>
      <Hero next={upcoming[0] ?? null} />
      <WhatWeDo number={1} />
      <UpcomingEvents number={2} events={upcoming} taken={taken} />
      <DepartmentTiles number={3} />
      <LatestRecordings number={4} recordings={recordings} />
      <TalentBand />
    </>
  )
}
