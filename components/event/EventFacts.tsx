import { Clock, MapPin, Mic, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Place } from '@/components/Place'
import { Icon } from '@/components/ui/Icon'
import type { PublicEvent } from '@/lib/events/types'
import { t } from '@/lib/i18n/t'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import type { Locale } from '@/lib/i18n/locale'

/**
 * The event's key facts in the dark head (redesign §6, D1-11), as a <dl> set like a ticket: the
 * day as a huge figure that drops in like a brick, with month and weekday; then the Riyadh time
 * range, format and place, and the presenter.
 */
export function EventFacts({ locale, event }: { locale: Locale; event: PublicEvent }) {
  const online = event.format === 'online'
  return (
    <dl aria-label={t(locale, 'event.facts')} className="ev-facts mt-10 grid gap-x-10 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
      <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-1 lg:pe-4">
        <dt className="sr-only">{t(locale, 'event.fact.date')}</dt>
        <dd className="flex items-end gap-4">
          <span className="ev-day text-[clamp(6rem,4rem+8vw,10.5rem)] leading-[0.95] font-bold text-white">{formatRiyadh(event.startsAt, 'day', locale)}</span>
          <span className="flex flex-col pb-[0.6em] leading-[1.35]">
            <span className="ev-month text-[clamp(1.375rem,1.1rem+1vw,1.875rem)] font-bold text-white">{formatRiyadh(event.startsAt, 'month', locale)}</span>
            <span className="text-[1.0625rem] text-on-dark">{formatRiyadh(event.startsAt, 'weekday', locale)}</span>
          </span>
        </dd>
      </div>
      <Fact icon={Clock} term={t(locale, 'event.fact.time')}>
        <span className="block">{formatRiyadhTimeRange(event.startsAt, event.endsAt, locale)}</span>
        <span className="block text-small font-normal text-on-dark">{t(locale, 'event.riyadhTime')}</span>
      </Fact>
      <Fact icon={online ? Video : MapPin} term={t(locale, 'event.fact.place')}>
        <span className="block">{t(locale, online ? 'event.format.online' : 'event.format.inPerson')}</span>
        {!online && event.location && (
          <span className="block text-small font-normal text-on-dark">
            <Place text={event.location} />
          </span>
        )}
      </Fact>
      {event.presenter && (
        <Fact icon={Mic} term={t(locale, 'event.fact.presenter')}>
          <Place text={event.presenter} />
        </Fact>
      )}
    </dl>
  )
}

function Fact({ icon, term, children }: { icon: LucideIcon; term: string; children: ReactNode }) {
  return (
    <div className="ev-fact border-s-2 border-mint/70 ps-4 lg:pb-[0.35rem]">
      <dt className="flex items-center gap-2 text-label text-mint-200">
        <Icon icon={icon} size={16} />
        {term}
      </dt>
      <dd className="mt-1.5 text-[1.125rem] leading-[1.5] font-semibold text-white">{children}</dd>
    </div>
  )
}
