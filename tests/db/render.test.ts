import { render } from '@react-email/render'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { SEED } from '../fixtures/seed'
import { addRegistration, createEvent, createUser, pgAdmin } from './helpers'

vi.mock('server-only', () => ({}))

import type { DeliveryRow } from '@/lib/email/outbox'
import { renderDelivery } from '@/lib/email/render'
import { subject } from '@/lib/email/subject'
import { fmtNum } from '@/lib/i18n/number'
import { t } from '@/lib/i18n/t'
import { verifyToken } from '@/lib/tokens/sign'

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await pgAdmin()
  try {
    return (await db.query(sql, params)).rows as T[]
  } finally {
    await db.end()
  }
}

const SITE_URL = process.env.SITE_URL!
const users: string[] = []
const events: number[] = []
const deliveries: number[] = []

async function newEvent(opts: Parameters<typeof createEvent>[0] = {}): Promise<number> {
  const id = await createEvent(opts)
  events.push(id)
  return id
}

type Kind = DeliveryRow['kind']
type Raw = { id: string; event_id: string | null; registration_id: string | null; kind: Kind; email: string; locale: 'ar' | 'en'; status: DeliveryRow['status']; batch_key: string | null; created_at: Date; attempted_at: Date | null }

/** a queued email_deliveries row, as the outbox reads it */
async function delivery(fields: { kind: Kind; email: string; eventId: number; registrationId?: number | null; locale?: 'ar' | 'en' }): Promise<DeliveryRow> {
  const [r] = await query<Raw>(
    'insert into email_deliveries (event_id, registration_id, kind, email, locale) values ($1, $2, $3, $4, $5) returning *',
    [fields.eventId, fields.registrationId ?? null, fields.kind, fields.email, fields.locale ?? 'ar'],
  )
  deliveries.push(Number(r.id))
  return {
    id: Number(r.id),
    event_id: r.event_id === null ? null : Number(r.event_id),
    registration_id: r.registration_id === null ? null : Number(r.registration_id),
    kind: r.kind,
    email: r.email,
    locale: r.locale,
    status: r.status,
    batch_key: r.batch_key,
    created_at: r.created_at.toISOString(),
    attempted_at: r.attempted_at?.toISOString() ?? null,
  }
}

/** a new user (with a profile) registered for the event, and a queued delivery about it */
async function registered(eventId: number, kind: Kind = 'confirmation', locale: 'ar' | 'en' = 'ar', status: 'registered' | 'waitlisted' | 'cancelled' = 'registered') {
  const user = await createUser()
  users.push(user.id)
  const registrationId = await addRegistration(user.id, eventId, status)
  return { user, registrationId, row: await delivery({ kind, email: user.email, eventId, registrationId, locale }) }
}

/** the rendered email and its html */
async function rendered(row: DeliveryRow) {
  const email = await renderDelivery(row)
  return { email, html: await render(email.react) }
}

const tokenIn = (html: string) => /\/registrations\/cancel\?t=([^"&<\s]+)/.exec(html)?.[1]
const titleOf = async (id: number) => (await query<{ title: string; title_en: string | null }>('select title, title_en from events where id = $1', [id]))[0]

afterAll(async () => {
  await query('delete from email_deliveries where id = any($1)', [deliveries])
  await query('delete from auth.users where id = any($1)', [users])
  await query('delete from events where id = any($1)', [events])
})

/* dev-2 D2-8, spec §10.1 and §10.6 */
describe('renderDelivery', () => {
  it('confirmation for an online event: the meeting link, and the calendar file', async () => {
    const event = await newEvent({ format: 'online' })
    await query('update event_private set meeting_url = $1 where event_id = $2', ['https://meet.example/x', event])
    const { row } = await registered(event)
    const { email, html } = await rendered(row)
    expect(html).toContain('https://meet.example/x')
    expect(email.attachments?.[0].filename).toBe(`hisn-event-${event}.ics`)
  })

  it('confirmation for an in-person event: no meeting link', async () => {
    const { row } = await registered(await newEvent())
    expect((await rendered(row)).html).not.toContain('meet.example')
  })

  it('waitlist_joined: no calendar file and no meeting link', async () => {
    const event = await newEvent({ format: 'online', capacity: 1 })
    const { row } = await registered(event, 'waitlist_joined', 'ar', 'waitlisted')
    const { email, html } = await rendered(row)
    expect(email.attachments ?? []).toHaveLength(0)
    expect(html).not.toContain('meet.example')
  })

  it('an announcement to an address with no account: no registration or profile needed', async () => {
    const event = await newEvent()
    const row = await delivery({ kind: 'announcement', email: 'nobody-here@test.local', eventId: event })
    const { email, html } = await rendered(row)
    expect(html).toContain('/unsubscribe?t=')
    expect(email.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(email.attachments ?? []).toHaveLength(0)
    expect(email.to).toBe('nobody-here@test.local')
  })

  it("the cancel link carries the registration's version", async () => {
    const { row, registrationId } = await registered(await newEvent())
    await query('update registrations set registration_version = 2 where id = $1', [registrationId])
    const token = tokenIn((await rendered(row)).html)
    expect(verifyToken(token!, 'cancel')).toStrictEqual({ sub: String(registrationId), ver: 2 })
  })

  it('Arabic: right to left, the /ar cancel link, and the Arabic subject', async () => {
    const event = await newEvent()
    const { row } = await registered(event, 'confirmation', 'ar')
    const { email, html } = await rendered(row)
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('/ar/registrations/cancel?t=')
    expect(email.subject).toBe(subject('confirmation', 'ar', { title: (await titleOf(event)).title }))
  })

  it('English, for an event with an English title (seed 101): the English title in the email and in the calendar file', async () => {
    const event = SEED.events.open
    const { title_en } = await titleOf(event)
    const { row } = await registered(event, 'confirmation', 'en')
    const { email, html } = await rendered(row)
    expect(html).toContain('dir="ltr"')
    expect(html).toContain('/en/registrations/cancel?t=')
    expect(html).toContain(`/en/events/${event}`)
    expect(email.subject).toBe(subject('confirmation', 'en', { title: title_en! }))
    const ics = email.attachments![0].content
    expect(ics).toContain(`SUMMARY:${title_en}`)
    expect(ics).toContain(`URL:${SITE_URL}/en/events/${event}`)
  })

  it('English, for an event without an English title: the Arabic title, marked as Arabic, and in the calendar file', async () => {
    const event = await newEvent()
    const { title } = await titleOf(event)
    const { row } = await registered(event, 'confirmation', 'en')
    const { email, html } = await rendered(row)
    expect(html).toMatch(new RegExp(`<[a-z0-9]+[^>]*lang="ar"[^>]*>(?:<!-- -->)?${title}`))
    expect(email.attachments![0].content).toContain(`SUMMARY:${title}`)
    expect(email.subject).toBe(subject('confirmation', 'en', { title }))
  })

  it('an English announcement: the /en unsubscribe link in the body, and the language-free one-click header', async () => {
    const row = await delivery({ kind: 'announcement', email: 'nobody-here@test.local', eventId: await newEvent(), locale: 'en' })
    const { email, html } = await rendered(row)
    expect(html).toContain('/en/unsubscribe?t=')
    expect(email.headers?.['List-Unsubscribe']).toContain('/api/unsubscribe?t=')
    expect(email.headers?.['List-Unsubscribe']).not.toContain('/en/')
  })

  /* The rest of D2-8's rules */
  it('sends to the address the row was queued for', async () => {
    const { row, user } = await registered(await newEvent())
    expect((await rendered(row)).email.to).toBe(user.email)
  })

  // owner's decision: the place as it is when the email is sent
  it('waitlist_joined shows the place on the waitlist at send time', async () => {
    const event = await newEvent({ capacity: 1 })
    await registered(event, 'confirmation')
    await registered(event, 'waitlist_joined', 'ar', 'waitlisted')
    const { row } = await registered(event, 'waitlist_joined', 'ar', 'waitlisted')
    expect((await rendered(row)).html).toContain(t('ar', 'email.waitlist_joined.position', { n: fmtNum(2, 'ar') }))
  })

  it('cancel_confirmation says a waitlist place was left only for someone who waited and was never promoted', async () => {
    const event = await newEvent({ capacity: 1 })
    const waited = await registered(event, 'cancel_confirmation', 'ar', 'waitlisted')
    const promoted = await registered(event, 'cancel_confirmation', 'ar', 'waitlisted')
    await query('update registrations set status = $1, promoted_at = now() where id = $2', ['cancelled', promoted.registrationId])
    await query('update registrations set status = $1 where id = $2', ['cancelled', waited.registrationId])
    expect((await rendered(waited.row)).html).toContain(t('ar', 'email.cancel_confirmation.heading.waitlist'))
    expect((await rendered(promoted.row)).html).toContain(t('ar', 'email.cancel_confirmation.heading.registration'))
  })

  it('attaches the calendar file to confirmation, promoted and event_changed only', async () => {
    const event = await newEvent()
    for (const kind of ['confirmation', 'promoted', 'event_changed', 'cancel_confirmation', 'event_cancelled'] as const) {
      const { row } = await registered(event, kind)
      const files = (await renderDelivery(row)).attachments ?? []
      expect(files.length, kind).toBe(['confirmation', 'promoted', 'event_changed'].includes(kind) ? 1 : 0)
    }
  })

  it('fails for a row whose registration is gone, so the outbox marks it failed', async () => {
    const event = await newEvent()
    const row = await delivery({ kind: 'confirmation', email: 'nobody-here@test.local', eventId: event, registrationId: null })
    await expect(renderDelivery(row)).rejects.toThrow()
  })
})
