import 'server-only'
import { createElement, type ReactElement } from 'react'
import { supabaseProdService } from '@/lib/db/prod'
import { unsubscribeHeaders } from '@/lib/email/headers'
import { buildIcs } from '@/lib/email/ics'
import { normalizeEmail } from '@/lib/email/normalize'
import type { DeliveryRow } from '@/lib/email/outbox'
import type { OutgoingEmail } from '@/lib/email/send'
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
import type { DeliveryKind, EventEmailData } from '@/lib/email/types'
import { serverEnv } from '@/lib/env'
import { PUBLIC_EVENT_COLUMNS, toPublicEvent } from '@/lib/events/queries'
import type { PublicEvent } from '@/lib/events/types'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/locale'
import { signToken } from '@/lib/tokens/sign'

/*
  Turns a queued delivery into an email (dev-2 D2-8, spec §10.1 and §10.6), all in the row's locale: the
  template, the subject, the event's text, the links and the calendar file. The locale was snapshotted when the
  row was queued. Tokens carry no locale; the links' paths do.
*/

/** lib/email/templates/<locale>/<Kind> */
const TEMPLATES = {
  ar: {
    Announcement: ArAnnouncement,
    CancelConfirmation: ArCancelConfirmation,
    Confirmation: ArConfirmation,
    EventCancelled: ArEventCancelled,
    EventChanged: ArEventChanged,
    Promoted: ArPromoted,
    WaitlistJoined: ArWaitlistJoined,
  },
  en: {
    Announcement: EnAnnouncement,
    CancelConfirmation: EnCancelConfirmation,
    Confirmation: EnConfirmation,
    EventCancelled: EnEventCancelled,
    EventChanged: EnEventChanged,
    Promoted: EnPromoted,
    WaitlistJoined: EnWaitlistJoined,
  },
}

/** the kinds that carry the meeting link (of an online event) and the calendar file */
const WITH_EVENT_FILE = new Set<DeliveryKind>(['confirmation', 'promoted', 'event_changed'])

const site = () => serverEnv().SITE_URL.replace(/\/+$/, '')

/**
 * The event's title in the email's language. STUB until D1-8 (eventText) merges: English falls back to the
 * Arabic title (title_en ?? title), with titleLang saying which one it is.
 */
function eventTitle(event: PublicEvent, locale: Locale): { title: string; titleLang: Locale } {
  return locale === 'en' && event.titleEn !== null ? { title: event.titleEn, titleLang: 'en' } : { title: event.title, titleLang: 'ar' }
}

async function loadEvent(id: number | null, locale: Locale, withMeetingUrl: boolean): Promise<EventEmailData> {
  if (id === null) throw new Error('email delivery without an event')
  const db = supabaseProdService()
  const { data: row, error } = await db.from('events').select(`${PUBLIC_EVENT_COLUMNS},title_en,description_en`).eq('id', id).single()
  if (error) throw error
  const event = toPublicEvent(row)
  let meetingUrl: string | null = null
  if (withMeetingUrl && event.format === 'online') {
    const { data, error: privateError } = await db.from('event_private').select('meeting_url').eq('event_id', id).maybeSingle()
    if (privateError) throw privateError
    meetingUrl = data?.meeting_url ?? null
  }
  const { title, titleLang } = eventTitle(event, locale)
  return {
    id: event.id,
    title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    format: event.format,
    location: event.location,
    meetingUrl,
    presenter: event.presenter,
    url: `${site()}/${locale}/events/${event.id}`,
    titleLang,
  }
}

type Registration = { id: number; event_id: number; user_id: string; waitlisted_at: string | null; promoted_at: string | null; registration_version: number }

/** 1 + the waiting rows ahead of this one by (waitlisted_at, id), as it is now (D2-10's order) */
async function waitlistPosition(registration: Registration): Promise<number> {
  if (registration.waitlisted_at === null) throw new Error(`registration ${registration.id} was never waitlisted`)
  const at = `"${registration.waitlisted_at}"`
  const { count, error } = await supabaseProdService()
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', registration.event_id)
    .eq('status', 'waitlisted')
    .or(`waitlisted_at.lt.${at},and(waitlisted_at.eq.${at},id.lt.${registration.id})`)
  if (error) throw error
  return 1 + (count ?? 0)
}

/** the email for a queued delivery, in the row's language */
export async function renderDelivery(d: DeliveryRow): Promise<OutgoingEmail> {
  const locale = isLocale(d.locale) ? d.locale : DEFAULT_LOCALE
  const T = TEMPLATES[locale]

  // An announcement may go to an address with no account: the event only, no registration or profile.
  if (d.kind === 'announcement') {
    const event = await loadEvent(d.event_id, locale, false)
    const unsubscribeUrl = `${site()}/${locale}/unsubscribe?t=${signToken({ kind: 'unsub', sub: normalizeEmail(d.email) })}`
    return {
      to: d.email,
      subject: subject(d.kind, locale, { title: event.title }),
      react: createElement(T.Announcement, { event, unsubscribeUrl }),
      headers: unsubscribeHeaders(d.email),
    }
  }

  if (d.registration_id === null) throw new Error(`${d.kind} delivery ${d.id} has no registration`)
  const db = supabaseProdService()
  const { data: registration, error } = await db
    .from('registrations')
    .select('id, event_id, user_id, waitlisted_at, promoted_at, registration_version')
    .eq('id', d.registration_id)
    .single<Registration>()
  if (error) throw error
  const { data: profile, error: profileError } = await db.from('profiles').select('full_name_ar').eq('id', registration.user_id).single()
  if (profileError) throw profileError

  const name: string = profile.full_name_ar
  const event = await loadEvent(registration.event_id, locale, WITH_EVENT_FILE.has(d.kind))
  // valid until the event starts (spec §8.5); a new registration_version makes older links do nothing
  const token = signToken({ kind: 'cancel', sub: String(registration.id), ver: registration.registration_version, exp: Math.floor(Date.parse(event.startsAt) / 1000) })
  const cancelUrl = `${site()}/${locale}/registrations/cancel?t=${token}`

  let react: ReactElement
  switch (d.kind) {
    case 'confirmation':
      react = createElement(T.Confirmation, { name, event, cancelUrl })
      break
    case 'promoted':
      react = createElement(T.Promoted, { name, event, cancelUrl })
      break
    case 'waitlist_joined':
      react = createElement(T.WaitlistJoined, { name, event, position: await waitlistPosition(registration), leaveUrl: cancelUrl })
      break
    case 'cancel_confirmation':
      react = createElement(T.CancelConfirmation, { name, event, wasWaitlisted: registration.waitlisted_at !== null && registration.promoted_at === null })
      break
    case 'event_cancelled':
      react = createElement(T.EventCancelled, { name, event })
      break
    case 'event_changed':
      react = createElement(T.EventChanged, { name, event, cancelUrl })
      break
  }

  return {
    to: d.email,
    subject: subject(d.kind, locale, { title: event.title }),
    react,
    ...(WITH_EVENT_FILE.has(d.kind)
      ? { attachments: [{ filename: `hisn-event-${event.id}.ics`, content: buildIcs({ id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, location: event.location, url: event.url }) }] }
      : {}),
  }
}
