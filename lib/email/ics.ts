/*
  The calendar file attached to registration emails (dev-2 D2-2, spec §10.1 and §10.6), RFC 5545: CRLF line
  ends, times in UTC, text values escaped. It has no language of its own: the caller (D2-8) passes the title in
  the delivery's language and the /{locale}/events/{id} page. The meeting link is never part of it.
*/

/** any ISO time as an iCalendar UTC date-time: 2026-11-18T18:00:00+03:00 → 20261118T150000Z */
const utc = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')

/** a TEXT value: backslash, semicolon, comma and line breaks escaped (RFC 5545 §3.3.11) */
const text = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')

/** One event as an .ics file. LOCATION falls back to the event page (online events have no location). */
export function buildIcs(e: { id: number; title: string; startsAt: string; endsAt: string; location: string | null; url: string }): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hisn//Events//AR',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${e.id}@hisn-sa.org`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(e.startsAt)}`,
    `DTEND:${utc(e.endsAt)}`,
    `SUMMARY:${text(e.title)}`,
    `LOCATION:${text(e.location ?? e.url)}`,
    `URL:${e.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    // every content line ends with CRLF, the last one too
    '',
  ].join('\r\n')
}
