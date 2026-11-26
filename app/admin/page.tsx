import type { Metadata } from 'next'
import Link from 'next/link'
import { Ban, Check, PencilLine, Plus } from 'lucide-react'
import { LinkButton } from '@/components/ui/Buttons'
import { Icon } from '@/components/ui/Icon'
import { Tag } from '@/components/ui/Tag'
import { adminEvents, type AdminEvent, type AdminEventStatus } from '@/lib/admin/events'
import { requireAdmin } from '@/lib/admin/require-admin'
import { fmtNum } from '@/lib/i18n/number'
import { t } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'

// the layout's title template covers deeper admin pages, not this one in its own segment
export const metadata: Metadata = { title: `${t('ar', 'admin.events.title')} · ${t('ar', 'admin.area')}` }

/*
  /admin, the events list (dev-1 D1-13; spec §7.11): every event, drafts included, with its Riyadh
  date, status, registered / capacity, waitlist and announcement status, and a link to edit it
  (/admin/events/{id}, D1-14). Events that haven't ended come first, then past ones.
  STAND-IN until D2-14: the announcement column only says whether sending started; D2-15 shows the
  live progress.
*/
export default async function AdminEventsPage() {
  await requireAdmin()
  const { upcoming, past } = await adminEvents()
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="text-h1 text-deep">{t('ar', 'admin.events.title')}</h1>
          <p className="mt-2 text-muted">{t('ar', 'calendar.timezone')}</p>
        </div>
        <LinkButton href="/admin/events/new">
          <Icon icon={Plus} size={18} />
          {t('ar', 'admin.events.new')}
        </LinkButton>
      </div>
      <EventTable id="admin-upcoming" title={t('ar', 'admin.events.upcoming')} events={upcoming} />
      <EventTable id="admin-past" title={t('ar', 'admin.events.past')} events={past} />
    </>
  )
}

const STATUS: Record<AdminEventStatus, { tone: 'muted' | 'ok' | 'danger'; icon: typeof Check }> = {
  draft: { tone: 'muted', icon: PencilLine },
  published: { tone: 'ok', icon: Check },
  cancelled: { tone: 'danger', icon: Ban },
}

const cell = 'px-4 py-3.5 align-middle'
/** headers, tags and short values stay on one line; the table scrolls instead */
const short = `${cell} whitespace-nowrap`

function EventTable({ id, title, events }: { id: string; title: string; events: AdminEvent[] }) {
  return (
    <section className="mt-12">
      <h2 id={id} className="mb-4 text-h3 text-deep">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="border border-line bg-white px-4 py-6 text-muted">{t('ar', 'admin.events.none')}</p>
      ) : (
        // the table scrolls sideways on phones; the region makes that reachable by keyboard, and
        // relative keeps its sr-only texts (absolute) inside the scroll box, off the page width
        <div role="region" aria-labelledby={id} tabIndex={0} className="relative overflow-x-auto border border-line bg-white">
          <table aria-labelledby={id} className="w-full min-w-[60rem] border-collapse text-start text-small">
            <thead className="bg-box text-label whitespace-nowrap text-muted">
              <tr>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.title')}</th>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.date')}</th>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.status')}</th>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.seats')}</th>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.waitlist')}</th>
                <th scope="col" className={`${cell} text-start`}>{t('ar', 'admin.col.announce')}</th>
                <th scope="col" className={cell}>
                  <span className="sr-only">{t('ar', 'admin.col.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function EventRow({ event }: { event: AdminEvent }) {
  const look = STATUS[event.status]
  return (
    <tr className="border-t border-line">
      <th scope="row" className={`${cell} text-start text-body font-semibold text-deep`}>
        {event.title}
      </th>
      <td className={short}>{formatRiyadh(event.startsAt, 'datetime')}</td>
      <td className={short}>
        <Tag tone={look.tone} icon={look.icon}>
          {t('ar', `admin.status.${event.status}`)}
        </Tag>
      </td>
      <td className={`${short} font-semibold text-deep`}>
        {fmtNum(event.registered, 'ar')} /{' '}
        {event.capacity === null ? (
          <>
            <span aria-hidden="true">∞</span>
            <span className="sr-only">{t('ar', 'event.ledger.noCapacity')}</span>
          </>
        ) : (
          fmtNum(event.capacity, 'ar')
        )}
      </td>
      <td className={cell}>{fmtNum(event.waitlisted, 'ar')}</td>
      <td className={`${short} text-muted`}>
        {event.announcementStartedAt === null ? t('ar', 'admin.announce.notSent') : t('ar', 'admin.announce.started')}
      </td>
      <td className={`${short} text-end`}>
        <Link
          href={`/admin/events/${event.id}`}
          aria-label={t('ar', 'admin.events.edit', { title: event.title })}
          className="inline-flex min-h-11 items-center font-semibold text-teal"
        >
          <span className="draw-line pb-0.5">{t('ar', 'admin.edit')}</span>
        </Link>
      </td>
    </tr>
  )
}
