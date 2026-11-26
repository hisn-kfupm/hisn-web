import Link from 'next/link'
import { Courses } from '@/components/calendar/Courses'
import { departments } from '@/lib/data/labels'
import type { PublicEvent } from '@/lib/events/types'
import { fmtNum } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh } from '@/lib/time/riyadh'
import type { Locale } from '@/lib/i18n/locale'

/**
 * Under the description: the event's ledger as a short wall in running bond (D1-11). Two bricks
 * (when registration closes, how many seats), then a long brick for the department and its
 * summary, offset by half. Courses lays it course by course as it comes into view.
 */
export function EventLedger({ locale, event }: { locale: Locale; event: PublicEvent }) {
  const dept = event.departmentCode ? departments.find((d) => d.code === event.departmentCode) : undefined
  return (
    <section aria-label={t(locale, 'event.ledger.label')} className="mt-14 lg:mt-16">
      <Courses className="ev-ledger flex flex-col gap-[3px]">
        <div data-course-row className="grid grid-cols-2 gap-[3px]">
          <Brick term={t(locale, 'event.ledger.closes')} value={formatRiyadh(event.registrationClosesAt, 'datetime')} />
          <Brick term={t(locale, 'event.ledger.capacity')} value={event.capacity === null ? t(locale, 'event.ledger.noCapacity') : fmtNum(event.capacity, locale)} big={event.capacity !== null} />
        </div>
        {dept && (
          <div data-course-row className="grid grid-cols-[0.5fr_4fr_0.5fr] gap-[3px] max-sm:grid-cols-1">
            <i aria-hidden="true" className="ev-brick ev-brick-half max-sm:hidden" />
            <div className="ev-brick px-5 py-5 sm:px-6">
              <p className="text-label text-muted">{t(locale, 'event.ledger.department')}</p>
              <p className="mt-1 text-[1.25rem] leading-[1.45] font-bold text-deep">
                {t(locale, `dept.${dept.code}.title` as StringKey)}
              </p>
              <p className="mt-1 text-small text-muted">{t(locale, `dept.${dept.code}.summary` as StringKey)}</p>
            </div>
            <i aria-hidden="true" className="ev-brick ev-brick-half max-sm:hidden" />
          </div>
        )}
      </Courses>
      <Link href="/events" className="group mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-teal no-underline">
        <span className="draw-line pb-0.5">{t(locale, 'home.events.all')}</span>
      </Link>
    </section>
  )
}

function Brick({ term, value, big = false }: { term: string; value: string; big?: boolean }) {
  return (
    <div className="ev-brick px-5 py-5 sm:px-6">
      <p className="text-label text-muted">{term}</p>
      <p className={big ? 'mt-1 text-[2.25rem] leading-[1.15] font-bold text-deep' : 'mt-1 text-[1.125rem] leading-[1.5] font-semibold text-deep'}>{value}</p>
    </div>
  )
}
