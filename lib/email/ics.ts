/*
  The calendar file attached to registration emails (dev-2 D2-2, spec §10.1 and §10.6), RFC 5545: CRLF line
  ends, lines folded at 75 octets, times in UTC, text values escaped. It has no language of its own: the caller
  (D2-8) passes the title in the delivery's language and the /{locale}/events/{id} page. The meeting link is never
  part of it. Its UID is the one the event page's calendar file uses (lib/events/ics.ts), so both are one entry.
*/

/** a time with its offset (Z, ±hh or ±hh:mm), as Postgres returns them; without one, Date would read it in the server's time zone */
const ZONED = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i

/** an ISO time as an iCalendar UTC date-time: 2026-11-18T18:00:00+03:00 → 20261118T150000Z */
function utc(iso: string): string {
  if (!ZONED.test(iso.trim())) throw new Error(`buildIcs: "${iso}" has no UTC offset`)
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')
}

/** a TEXT value: backslash, semicolon, comma and line breaks escaped (RFC 5545 §3.3.11) */
const text = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')

const encoder = new TextEncoder()

/** RFC 5545 §3.1: a line over 75 octets continues on lines that start with a space; a character is never split */
function fold(line: string): string {
  const lines: string[] = []
  let current = ''
  let size = 0
  let limit = 75
  for (const char of line) {
    const octets = encoder.encode(char).length
    if (size + octets > limit) {
      lines.push(current)
      current = ''
      size = 0
      limit = 74 // the leading space counts
    }
    current += char
    size += octets
  }
  lines.push(current)
  return lines.join('\r\n ')
}

/** One event as an .ics file. LOCATION falls back to the event page (online events have no location). */
export function buildIcs(e: { id: number; title: string; startsAt: string; endsAt: string; location: string | null; url: string }): string {
  // a URL can't hold a line break, and one would add a property of its own
  const url = e.url.replace(/[\r\n]/g, '')
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
    `LOCATION:${text(e.location ?? url)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .map((line) => `${line}\r\n`) // every content line ends with CRLF, the last one too
    .join('')
}
