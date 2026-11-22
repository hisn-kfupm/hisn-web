import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { CalendarPlus } from 'lucide-react'
import { PageHead } from '@/components/brand/PageHead'
import { SectionHead } from '@/components/brand/SectionHead'
import { StatusBadge } from '@/components/calendar/StatusBadge'
import { EventFacts } from '@/components/event/EventFacts'
import { EventLedger } from '@/components/event/EventLedger'
import { RegisterBlock } from '@/components/event/RegisterBlock'
import { EventsTimetable } from '@/components/home/EventsTimetable'
import { TalentBand } from '@/components/home/TalentBand'
import { Icon } from '@/components/ui/Icon'
import { getSession } from '@/lib/auth/session-stub'
import { deptIcon } from '@/lib/data/dept-icons'
import { eventCover } from '@/lib/data/images'
import { registerAction, joinWaitlistAction, cancelAction } from '@/lib/events/actions-stub'
import { calendarStatus } from '@/lib/events/calendar-status'
import { eventIcs, icsHref } from '@/lib/events/ics'
import { isAlmostFull } from '@/lib/events/almost-full'
import { myStatus, myWaitlistPosition } from '@/lib/events/mine'
import { getPublicEvent, upcomingEvents } from '@/lib/events/queries'
import { registerLabels } from '@/lib/events/register-labels'
import { getSeatsLeft, seatsTaken } from '@/lib/events/seats'
import { standInPageIds } from '@/lib/events/stand-in'
import { eventButtonState } from '@/lib/events/state'
import type { PublicEvent } from '@/lib/events/types'
import { arabicDigits, isArabicText } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'

/*
  /events/[id], the event page (dev-1 D1-11). Seats and the visitor's own status are live, so the
  page renders per request: dev-1 asks for `dynamic = 'force-dynamic'`, which Cache Components
  replaces with reading the request (params) inside a Suspense boundary, after connection(). The
  meeting link is never read here (PublicEvent has none). The register actions are the stub until
  D2-11 switches this import to ./actions.ts.
*/

type Params = Promise<{ id: string }>

const ID = /^\d+$/

async function load(id: string): Promise<PublicEvent | null> {
  if (!ID.test(id)) return null
  return getPublicEvent(Number(id))
}

/*
  Known ids at build time. Besides prebuilding their shells, this lets the shell's usePathname()
  (header, footer curtain) resolve during prerendering; without it every /events/[id] logs
  "usePathname() outside of <Suspense>". Other ids still render on demand (dynamicParams).
  STAND-IN: the stand-in rows. Real: the published and cancelled ids,
    db.from('events').select('id').in('status', ['published', 'cancelled'])
*/
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return standInPageIds().map((id) => ({ id: String(id) }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  await connection()
  const event = await load(id)
  return event ? { title: event.title } : {}
}

export default function EventPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageHead kicker={t('nav.events')} size="title" title={t('nav.events')} />}>
      <EventView params={params} />
    </Suspense>
  )
}

async function EventView({ params }: { params: Params }) {
  const { id } = await params
  if (!ID.test(id)) notFound()
  // live seats, the visitor's status and "now": never part of a prerender
  await connection()
  const event = await load(id)
  if (!event) notFound()

  const now = new Date()
  const [seatsLeft, session] = await Promise.all([getSeatsLeft(event.id), getSession()])
  const mine = session ? await myStatus(event.id) : null
  const position = mine === 'waitlisted' ? await myWaitlistPosition(event.id) : null
  const state = eventButtonState(event, seatsLeft, mine, now)
  const status = calendarStatus(event, seatsLeft, now.getTime())
  const dept = event.departmentCode

  const related = dept ? (await upcomingEvents({ limit: 4, departmentCode: dept })).filter((e) => e.id !== event.id).slice(0, 3) : []
  const taken = await seatsTaken(related.map((e) => e.id))

  const live = state !== 'cancelled' && state !== 'ended'
  const place = event.format === 'online' ? t('event.format.online') : (event.location ?? t('event.format.inPerson'))
  const paragraphs = event.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const coverImage = eventCover(event)
  const cover = { src: coverImage.src, blurDataURL: coverImage.remote ? undefined : coverImage.blurDataURL }

  return (
    <>
      <PageHead
        size="title"
        crumbs={[{ href: '/', label: t('crumbs.home') }, { href: '/events', label: t('nav.events') }, { label: event.title }]}
        backdrop={cover}
        kicker={
          dept ? (
            <span className="inline-flex items-center gap-2.5 text-[0.9375rem]">
              <Icon icon={deptIcon(dept)} size={20} className="text-mint" />
              {t(`dept.${dept}.title` as StringKey)}
            </span>
          ) : (
            t('nav.events')
          )
        }
        title={event.title}
      >
        {status !== 'open' && (
          <div className="mt-6">
            <StatusBadge status={status} />
          </div>
        )}
        <EventFacts event={event} />
      </PageHead>

      <section aria-labelledby="event-about" className="ev-body relative z-10 bg-page pt-14 lg:pt-0 lg:pb-28">
        <div className="wrap grid gap-x-12 lg:grid-cols-12 xl:gap-x-16">
          <div className="pb-16 lg:col-span-7 lg:pt-20 lg:pb-0">
            <SectionHead number={1} id="event-about" title={t('event.about')} />
            <div className="ev-prose max-w-[38rem] space-y-6 text-[1.125rem] leading-[1.95] text-deep lg:text-[1.1875rem]">
              {paragraphs.map((p, i) => (
                <p key={i}>{isArabicText(p) ? arabicDigits(p) : p}</p>
              ))}
            </div>
            <EventLedger event={event} />
            {live && (
              <div className="mt-4 lg:hidden">
                <IcsLink event={event} place={place} tone="light" />
              </div>
            )}
          </div>
          <div className="ev-aside lg:col-span-5">
            <RegisterBlock
              eventId={event.id}
              state={state}
              position={position}
              signedIn={session !== null}
              recordingUrl={event.recordingUrl}
              actions={{ register: registerAction, joinWaitlist: joinWaitlistAction, cancel: cancelAction }}
              labels={registerLabels()}
              reopensAs={isAlmostFull(event.capacity, seatsLeft === null ? null : seatsLeft + (mine === 'registered' ? 1 : 0)) ? 'open_almost_full' : 'open'}
              capacity={event.capacity}
              seatsLeft={seatsLeft}
            >
              {live && <IcsLink event={event} place={place} tone="dark" />}
            </RegisterBlock>
          </div>
        </div>
      </section>

      {related.length > 0 && <EventsTimetable number={2} events={related} taken={taken} title={t('event.more')} className="bg-box" />}
      <TalentBand />
    </>
  )
}

/** «أضفها إلى تقويمك»: the event as an .ics download (in the register block on desktop, under the ledger on phones) */
function IcsLink({ event, place, tone }: { event: PublicEvent; place: string; tone: 'light' | 'dark' }) {
  return (
    <a href={icsHref(eventIcs(event, place))} download={`hisn-event-${event.id}.ics`} className={`group inline-flex min-h-11 items-center gap-2 font-semibold no-underline ${tone === 'dark' ? 'text-white' : 'text-teal'}`}>
      <Icon icon={CalendarPlus} size={18} className={tone === 'dark' ? 'text-mint' : undefined} />
      <span className="draw-line pb-0.5">{t('event.addToCalendar')}</span>
    </a>
  )
}
