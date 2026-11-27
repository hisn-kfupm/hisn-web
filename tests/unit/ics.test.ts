// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildIcs } from '@/lib/email/ics'

// The values of the task's cases (dev-2 D2-2)
const event = {
  id: 7,
  title: 'ورشة, الطائرات',
  startsAt: '2026-11-18T15:00:00Z',
  endsAt: '2026-11-18T17:00:00Z',
  location: null,
  url: 'https://hisn-sa.org/ar/events/7',
}

afterEach(() => {
  vi.useRealTimers()
})

/* dev-2 D2-2, spec §10.1 and §10.6 */
describe('buildIcs', () => {
  it('writes the start as a UTC date-time', () => {
    expect(buildIcs(event)).toContain('DTSTART:20261118T150000Z')
  })

  it('gives an event the same UID on every call', () => {
    for (const ics of [buildIcs(event), buildIcs(event)]) expect(ics).toContain('UID:event-7@hisn-sa.org')
  })

  it('ends lines with CRLF, never a bare line feed', () => {
    const ics = buildIcs(event)
    expect(ics).toContain('\r\n')
    expect(ics.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
  })

  it('escapes a comma in the title', () => {
    expect(buildIcs(event)).toContain('SUMMARY:ورشة\\, الطائرات')
  })

  it('uses the event page as the location when the event has none', () => {
    expect(buildIcs({ ...event, location: null })).toContain('LOCATION:https://hisn-sa.org/ar/events/7')
  })

  it('writes the title and link it is given (here an English title and the /en page)', () => {
    const ics = buildIcs({ ...event, title: 'Drone workshop', url: 'https://hisn-sa.org/en/events/7' })
    expect(ics).toContain('SUMMARY:Drone workshop')
    expect(ics).toContain('URL:https://hisn-sa.org/en/events/7')
  })

  /* The rest of D2-2's format */
  it('has the task\'s lines in order, DTSTAMP is the current UTC time, and the last line ends with CRLF too', () => {
    vi.useFakeTimers({ now: new Date('2026-11-10T09:08:07.654Z') })
    expect(buildIcs({ ...event, location: 'قاعة 1' }).split('\r\n')).toStrictEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hisn//Events//AR',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:event-7@hisn-sa.org',
      'DTSTAMP:20261110T090807Z',
      'DTSTART:20261118T150000Z',
      'DTEND:20261118T170000Z',
      'SUMMARY:ورشة\\, الطائرات',
      'LOCATION:قاعة 1',
      'URL:https://hisn-sa.org/ar/events/7',
      'END:VEVENT',
      'END:VCALENDAR',
      // RFC 5545: every content line ends with CRLF, END:VCALENDAR included
      '',
    ])
  })

  it('escapes backslashes, semicolons, commas and every kind of line break in the title and the location', () => {
    const ics = buildIcs({ ...event, title: '\\;,\n\r\n\r', location: ';,\\\n' })
    expect(ics).toContain('SUMMARY:\\\\\\;\\,\\n\\n\\n\r\n')
    expect(ics).toContain('LOCATION:\\;\\,\\\\\\n\r\n')
    expect(ics.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
  })

  it('reads times with any UTC offset, as Postgres returns them', () => {
    const ics = buildIcs({ ...event, startsAt: '2026-11-18T15:00:00+00:00', endsAt: '2026-11-18T20:00:00+03:00' })
    expect(ics).toContain('DTSTART:20261118T150000Z')
    expect(ics).toContain('DTEND:20261118T170000Z')
  })
})
