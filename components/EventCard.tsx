import Link from 'next/link'
import { ArrowRight, Ban, Check, Clock, MapPin, Play, Video } from 'lucide-react'
import { Place } from '@/components/Place'
import { EventImage } from '@/components/EventImage'
import { Icon } from '@/components/ui/Icon'
import { Tag } from '@/components/ui/Tag'
import type { PublicEvent } from '@/lib/events/types'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'
import { t, type StringKey } from '@/lib/i18n/t'
import { cn } from '@/lib/cn'

type Props = {
  event: PublicEvent
  /** 'upcoming' for events still to come, 'recording' for ended events with a recording */
  variant: 'upcoming' | 'recording'
}

/**
 * Event card (prototype «لبنة»): a date block at the inline start, then department, title, time,
 * place and a status line. The whole card is one link (the title's, stretched); the recording
 * link sits above it. No seat counts: the pages that use this card are cached, and seats are live
 * (D1-10 adds them where the page is dynamic).
 */
export function EventCard({ event, variant }: Props) {
  const cancelled = event.status === 'cancelled'
  const quiet = cancelled || variant === 'recording'
  const online = event.format === 'online'

  return (
    <article
      className={cn(
        'relative flex h-full flex-col border border-line bg-white',
        // the teal top edge draws in from the inline start on hover and focus
        "before:absolute before:-inset-x-px before:-top-px before:z-10 before:h-0.5 before:scale-x-0 before:bg-teal before:transition-transform before:duration-200 before:ease-brand before:content-[''] focus-within:before:scale-x-100 hover:before:scale-x-100 before:origin-(--start)",
      )}
    >
      {variant === 'recording' && <EventImage imageUrl={event.imageUrl} departmentCode={event.departmentCode} />}
      <div className="grid min-h-[13.25rem] flex-1 grid-cols-[5.25rem_minmax(0,1fr)]">
        <div data-testid="date-block" aria-hidden="true" className="flex flex-col items-center gap-0.5 bg-box px-1.5 py-4 text-center">
          <span className={cn('text-[2.5rem] leading-[1.1] font-bold', quiet ? 'text-muted' : 'text-teal')}>{formatRiyadh(event.startsAt, 'day')}</span>
          <span className="text-label">{formatRiyadh(event.startsAt, 'month')}</span>
          <span className="text-label font-normal text-muted">{formatRiyadh(event.startsAt, 'weekday')}</span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 px-5 pt-4 pb-5">
          {event.departmentCode && (
            <p data-testid="event-dept" className="text-label text-accent-strong">
              {t(`dept.${event.departmentCode}.title` as StringKey)}
            </p>
          )}
          <h3 className="line-clamp-2 text-h3">
            <Link
              href={`/events/${event.id}`}
              className={cn('no-underline after:absolute after:inset-0 hover:underline', cancelled ? 'text-muted' : 'text-deep')}
            >
              {event.title}
              <span className="sr-only">{t('a11y.when', { when: formatRiyadh(event.startsAt, 'date') })}</span>
            </Link>
          </h3>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-small text-muted">
            <li className="flex items-center gap-2">
              <Icon icon={Clock} size={16} />
              <span>{formatRiyadhTimeRange(event.startsAt, event.endsAt)}</span>
            </li>
            {(online || event.location) && (
              <li className="flex items-center gap-2">
                <Icon icon={online ? Video : MapPin} size={16} />
                <span>{online ? t('event.format.online') : <Place text={event.location ?? ''} />}</span>
              </li>
            )}
          </ul>

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-1.5 text-small">
            {cancelled ? (
              <Tag tone="danger" icon={Ban}>{t('event.badge.cancelled')}</Tag>
            ) : variant === 'recording' ? (
              <>
                <Tag tone="muted" icon={Check}>{t('event.badge.ended')}</Tag>
                {event.recordingUrl && (
                  <Link href="/library" className="relative z-10 inline-flex min-h-11 items-center gap-1.5 font-semibold text-teal underline-offset-4 hover:underline">
                    <Icon icon={Play} size={16} />
                    {t('event.watchRecording')}
                  </Link>
                )}
              </>
            ) : (
              // a visual cue only: the stretched title link already takes you there
              <span aria-hidden="true" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-teal">
                {t('event.card.details')}
                <Icon icon={ArrowRight} mirror size={16} />
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
