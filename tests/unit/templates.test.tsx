// @vitest-environment node
import { render } from '@react-email/render'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import { subject } from '@/lib/email/subject'
import ArAnnouncement from '@/lib/email/templates/ar/Announcement'
import ArCancelConfirmation from '@/lib/email/templates/ar/CancelConfirmation'
import ArConfirmation from '@/lib/email/templates/ar/Confirmation'
import ArEventCancelled from '@/lib/email/templates/ar/EventCancelled'
import ArEventChanged from '@/lib/email/templates/ar/EventChanged'
import ArPromoted from '@/lib/email/templates/ar/Promoted'
import ArWaitlistJoined from '@/lib/email/templates/ar/WaitlistJoined'
import EnAnnouncement from '@/lib/email/templates/en/Announcement'
import EnCancelConfirmation from '@/lib/email/templates/en/CancelConfirmation'
import EnConfirmation from '@/lib/email/templates/en/Confirmation'
import EnEventCancelled from '@/lib/email/templates/en/EventCancelled'
import EnEventChanged from '@/lib/email/templates/en/EventChanged'
import EnPromoted from '@/lib/email/templates/en/Promoted'
import EnWaitlistJoined from '@/lib/email/templates/en/WaitlistJoined'
import { DELIVERY_KINDS, type DeliveryKind, type EventEmailData } from '@/lib/email/types'
import type { Locale } from '@/lib/i18n/locale'
import { fmtNum } from '@/lib/i18n/number'
import { t, type StringKey } from '@/lib/i18n/t'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'

// Sample values: the task's (dev-2 D2-3), and for the rest values approved for these tests.
const event: EventEmailData = {
  id: 7,
  title: 'ورشة الأمن السيبراني',
  startsAt: '2026-11-18T15:00:00Z',
  endsAt: '2026-11-18T17:00:00Z',
  format: 'in_person',
  location: 'قاعة 1',
  meetingUrl: null,
  presenter: 'علي أحمد',
  url: 'https://x.test/ar/events/7',
  titleLang: 'ar',
}
const online = { format: 'online', location: null, meetingUrl: 'https://meet.example/abc' } as const
const enEvent: EventEmailData = { ...event, title: 'Cyber workshop', url: 'https://x.test/en/events/7', titleLang: 'en' }
const LINKS: Record<Locale, { event: EventEmailData; cancelUrl: string; unsubscribeUrl: string }> = {
  ar: { event, cancelUrl: 'https://x.test/ar/registrations/cancel?t=abc', unsubscribeUrl: 'https://x.test/ar/unsubscribe?t=abc' },
  en: { event: enEvent, cancelUrl: 'https://x.test/en/registrations/cancel?t=abc', unsubscribeUrl: 'https://x.test/en/unsubscribe?t=abc' },
}
const NAME = 'علي أحمد'

const TEMPLATES = {
  ar: {
    confirmation: ArConfirmation,
    promoted: ArPromoted,
    waitlist_joined: ArWaitlistJoined,
    cancel_confirmation: ArCancelConfirmation,
    event_cancelled: ArEventCancelled,
    event_changed: ArEventChanged,
    announcement: ArAnnouncement,
  },
  en: {
    confirmation: EnConfirmation,
    promoted: EnPromoted,
    waitlist_joined: EnWaitlistJoined,
    cancel_confirmation: EnCancelConfirmation,
    event_cancelled: EnEventCancelled,
    event_changed: EnEventChanged,
    announcement: EnAnnouncement,
  },
}

/** one email of each kind, with sample props, for any event */
function email(kind: DeliveryKind, locale: Locale, e: EventEmailData = LINKS[locale].event): ReactElement {
  const T = TEMPLATES[locale]
  const { cancelUrl, unsubscribeUrl } = LINKS[locale]
  switch (kind) {
    case 'confirmation':
      return <T.confirmation name={NAME} event={e} cancelUrl={cancelUrl} />
    case 'promoted':
      return <T.promoted name={NAME} event={e} cancelUrl={cancelUrl} />
    case 'waitlist_joined':
      return <T.waitlist_joined name={NAME} event={e} position={3} leaveUrl={cancelUrl} />
    case 'cancel_confirmation':
      return <T.cancel_confirmation name={NAME} event={e} wasWaitlisted={false} />
    case 'event_cancelled':
      return <T.event_cancelled name={NAME} event={e} />
    case 'event_changed':
      return <T.event_changed name={NAME} event={e} cancelUrl={cancelUrl} />
    case 'announcement':
      return <T.announcement event={e} unsubscribeUrl={unsubscribeUrl} />
  }
}

/** text as React writes it into html */
const escaped = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
/** a string from a string file, as it appears in the html */
const shown = (locale: Locale, key: StringKey, vars?: Record<string, string | number>) => escaped(t(locale, key, vars))

/** the opening tag of the element whose only content is `text` */
function tagAround(html: string, text: string): string | undefined {
  return new RegExp(`(<[a-z0-9]+[^>]*>)(?:<!-- -->)?${text}(?:<!-- -->)?</`).exec(html)?.[1]
}

/* dev-2 D2-3, spec §10.1 and §10.6. Arabic templates unless stated. */
describe('email templates', () => {
  it('Confirmation for an online event shows the meeting link, right to left', async () => {
    const html = await render(<ArConfirmation name={NAME} event={{ ...event, ...online }} cancelUrl={LINKS.ar.cancelUrl} />)
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('https://meet.example/abc')
  })

  it('Confirmation for an in-person event never shows a meeting link, even when one is set', async () => {
    const html = await render(<ArConfirmation name={NAME} event={{ ...event, meetingUrl: 'https://meet.example/abc' }} cancelUrl={LINKS.ar.cancelUrl} />)
    expect(html).not.toContain('meet.example')
  })

  it('Confirmation isolates a Latin name inside the Arabic text', async () => {
    const html = await render(<ArConfirmation name="Ali Ahmed" event={event} cancelUrl={LINKS.ar.cancelUrl} />)
    expect(html).toMatch(/<bdi[^>]*>Ali Ahmed<\/bdi>/)
  })

  // the site writes figures in Arabic with Eastern Arabic digits, and so do these emails (owner's decision)
  it('WaitlistJoined shows the position and the leave link, never the meeting link', async () => {
    const ar = await render(<ArWaitlistJoined name={NAME} event={{ ...event, ...online }} position={3} leaveUrl={LINKS.ar.cancelUrl} />)
    expect(ar).toContain(shown('ar', 'email.waitlist_joined.position', { n: fmtNum(3, 'ar') }))
    expect(fmtNum(3, 'ar')).toBe('٣')
    expect(ar).not.toContain('https://meet.example/abc')
    expect(ar).toContain(LINKS.ar.cancelUrl)

    const en = await render(<EnWaitlistJoined name={NAME} event={{ ...enEvent, ...online }} position={3} leaveUrl={LINKS.en.cancelUrl} />)
    expect(en).toContain(shown('en', 'email.waitlist_joined.position', { n: 3 }))
    expect(en).not.toContain('https://meet.example/abc')
    expect(en).toContain(LINKS.en.cancelUrl)
  })

  it('Announcement carries the unsubscribe link', async () => {
    expect(await render(<ArAnnouncement event={event} unsubscribeUrl={LINKS.ar.unsubscribeUrl} />)).toContain(LINKS.ar.unsubscribeUrl)
    expect(await render(<EnAnnouncement event={enEvent} unsubscribeUrl={LINKS.en.unsubscribeUrl} />)).toContain(LINKS.en.unsubscribeUrl)
  })

  it('subject: the title shown in each language, and a different subject per language', () => {
    const arabic = subject('confirmation', 'ar', { title: 'ورشة الأمن السيبراني' })
    const english = subject('confirmation', 'en', { title: 'Cyber workshop' })
    expect(arabic).toContain('ورشة الأمن السيبراني')
    expect(english).toContain('Cyber workshop')
    expect(english).not.toBe(arabic)
  })

  it.each(DELIVERY_KINDS.flatMap((kind) => (['ar', 'en'] as const).map((locale) => [kind, locale] as const)))(
    '%s in %s renders with its language and direction',
    async (kind, locale) => {
      const html = await render(email(kind, locale))
      expect(html).toContain(`lang="${locale}"`)
      expect(html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`)
      expect(html).not.toContain(`dir="${locale === 'ar' ? 'ltr' : 'rtl'}"`)
    },
  )

  it('en/Confirmation links to the pages it is given, with their language', async () => {
    const html = await render(<EnConfirmation name={NAME} event={enEvent} cancelUrl="https://x.test/en/registrations/cancel?t=abc" />)
    expect(html).toContain('https://x.test/en/events/7')
    expect(html).toContain('https://x.test/en/registrations/cancel?t=abc')
  })

  it('en/Confirmation isolates an Arabic name inside the English text', async () => {
    // no presenter, so only the name can match
    const html = await render(<EnConfirmation name="علي أحمد" event={{ ...enEvent, presenter: null }} cancelUrl={LINKS.en.cancelUrl} />)
    expect(html).toMatch(/<bdi[^>]*>علي أحمد<\/bdi>/)
  })

  it('en/Confirmation shows a fallback Arabic title as Arabic, right to left', async () => {
    const html = await render(<EnConfirmation name={NAME} event={{ ...enEvent, title: 'ورشة الأمن السيبراني', titleLang: 'ar' }} cancelUrl={LINKS.en.cancelUrl} />)
    const tag = tagAround(html, 'ورشة الأمن السيبراني')
    expect(tag).toContain('lang="ar"')
    expect(tag).toContain('dir="rtl"')
  })

  /* The rest of D2-3's rules */
  it.each(['ar', 'en'] as const)('shows the meeting link only in Confirmation, Promoted and EventChanged (%s)', async (locale) => {
    const withLink = { ...LINKS[locale].event, ...online }
    for (const kind of DELIVERY_KINDS) {
      const html = await render(email(kind, locale, withLink))
      expect(html.includes('https://meet.example/abc'), kind).toBe(['confirmation', 'promoted', 'event_changed'].includes(kind))
    }
  })

  it.each(['ar', 'en'] as const)('shows the date and time in Riyadh time, in the email\'s language (%s)', async (locale) => {
    const html = await render(email('confirmation', locale))
    expect(html).toContain(formatRiyadh(event.startsAt, 'date', locale))
    expect(html).toContain(formatRiyadh(event.startsAt, 'weekday', locale))
    expect(html).toContain(escaped(formatRiyadhTimeRange(event.startsAt, event.endsAt, locale)))
    expect(html).toContain(shown(locale, 'email.event.riyadhTime'))
  })

  // as on the site (components/Place.tsx): an Arabic place reads in Eastern Arabic digits
  it('writes the digits of an Arabic place in Eastern Arabic, isolated', async () => {
    for (const locale of ['ar', 'en'] as const) {
      const html = await render(email('confirmation', locale))
      expect(html).toMatch(/<bdi[^>]*>قاعة ١<\/bdi>/)
      expect(html).not.toContain('قاعة 1')
    }
  })

  // as on the site (components/event/EventFacts.tsx): a Latin presenter is isolated as English; the greeting's
  // name differs, so only the presenter can match
  it('isolates the presenter', async () => {
    for (const locale of ['ar', 'en'] as const) {
      const html = await render(email('confirmation', locale, { ...LINKS[locale].event, presenter: 'Ali Ahmed' }))
      expect(html).toMatch(/<bdi lang="en">Ali Ahmed<\/bdi>/)
    }
  })

  it('writes the weekday and date as the site does (event.weekdayDate)', async () => {
    for (const locale of ['ar', 'en'] as const) {
      const when = t(locale, 'event.weekdayDate', { weekday: formatRiyadh(event.startsAt, 'weekday', locale), date: formatRiyadh(event.startsAt, 'date', locale) })
      expect(await render(email('confirmation', locale))).toContain(escaped(when))
    }
  })

  it('shows the Hisn header and the contact address, isolated as English, in the footer', async () => {
    for (const locale of ['ar', 'en'] as const) {
      const html = await render(email('confirmation', locale))
      expect(html).toContain(shown(locale, 'brand.name'))
      expect(html).toContain(shown(locale, 'email.footer.contact'))
      expect(html).toMatch(new RegExp(`<bdi lang="en">${CONTACT_EMAIL}</bdi>`))
      expect(html).toContain("'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif".replace(/'/g, '&#x27;'))
    }
  })

  it('CancelConfirmation says whether a registration or a waitlist place was cancelled', async () => {
    const registration = await render(<ArCancelConfirmation name={NAME} event={event} wasWaitlisted={false} />)
    const waitlist = await render(<ArCancelConfirmation name={NAME} event={event} wasWaitlisted />)
    expect(registration).toContain(shown('ar', 'email.cancel_confirmation.heading.registration'))
    expect(registration).not.toContain(shown('ar', 'email.cancel_confirmation.heading.waitlist'))
    expect(waitlist).toContain(shown('ar', 'email.cancel_confirmation.heading.waitlist'))
    expect(waitlist).not.toContain(shown('ar', 'email.cancel_confirmation.heading.registration'))
  })

  it('offers the cancel link where there is a seat to give up, and nowhere else', async () => {
    for (const locale of ['ar', 'en'] as const) {
      for (const kind of DELIVERY_KINDS) {
        const html = await render(email(kind, locale))
        // WaitlistJoined's leave link is the same cancel page
        expect(html.includes('/registrations/cancel?t='), `${kind} ${locale}`).toBe(['confirmation', 'promoted', 'event_changed', 'waitlist_joined'].includes(kind))
      }
    }
  })

  it('greets the person by name, except in the Announcement, which has no name', async () => {
    for (const locale of ['ar', 'en'] as const) {
      for (const kind of DELIVERY_KINDS) {
        expect((await render(email(kind, locale))).includes(shown(locale, 'email.greeting')), `${kind} ${locale}`).toBe(kind !== 'announcement')
      }
    }
  })

  it('every subject carries the title, on one line, in both languages', () => {
    for (const kind of DELIVERY_KINDS) {
      for (const [locale, title] of [['ar', 'ورشة الأمن السيبراني'], ['en', 'Cyber workshop']] as const) {
        expect(subject(kind, locale, { title }), `${kind} ${locale}`).toContain(title)
      }
      expect(subject(kind, 'en', { title: 'Cyber\r\nworkshop' })).not.toMatch(/[\r\n]/)
    }
  })
})
