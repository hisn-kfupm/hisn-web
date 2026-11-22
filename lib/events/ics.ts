import type { PublicEvent } from './types'

/*
  «أضفها إلى تقويمك» (redesign §6): one event as an iCalendar file (RFC 5545), offered as a data:
  link, so no route is needed. Times stay in UTC (the Z form); calendars show them in local time.
  The meeting link is never part of it (PublicEvent has none).
*/

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** the .ics text for an event; `place` is the location line, `url` the event page when the site URL is known */
export function eventIcs(e: Pick<PublicEvent, 'id' | 'title' | 'description' | 'startsAt' | 'endsAt'>, place: string, url?: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hisn//Events//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:event-${e.id}@hisn`,
    `DTSTAMP:${stamp(e.startsAt)}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(e.endsAt)}`,
    `SUMMARY:${escape(e.title)}`,
    `DESCRIPTION:${escape(e.description)}`,
    `LOCATION:${escape(place)}`,
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
  return lines.join('\r\n')
}

/** a data: URL for <a download> */
export function icsHref(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}
