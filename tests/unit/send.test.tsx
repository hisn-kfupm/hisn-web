// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import EnConfirmation from '@/lib/email/templates/en/Confirmation'
import type { EventEmailData } from '@/lib/email/types'

vi.mock('server-only', () => ({}))
const mail = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn(), emailsSend: vi.fn(), batchSend: vi.fn(), keys: [] as unknown[] }))
vi.mock('nodemailer', () => ({ default: { createTransport: mail.createTransport } }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mail.emailsSend }
    batch = { send: mail.batchSend }
    constructor(key: unknown) {
      mail.keys.push(key)
    }
  },
}))

// serverEnv() checks the whole server environment, so the tests set a valid one.
const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  TOKEN_SECRET: 'local-test-secret-0123456789abcdef0123',
  EMAIL_TRANSPORT: 'smtp',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '54325',
  SITE_URL: 'http://localhost:3000',
  CRON_SECRET: 'local-cron',
}

/** a fresh lib/email/send.ts reading ENV plus `env` (serverEnv() and the transports are cached) */
async function load(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [name, value] of Object.entries({ ...ENV, ...env })) vi.stubEnv(name, value)
  return import('@/lib/email/send')
}

// the approved sample values of the template tests
const event: EventEmailData = {
  id: 7,
  title: 'Cyber workshop',
  startsAt: '2026-11-18T15:00:00Z',
  endsAt: '2026-11-18T17:00:00Z',
  format: 'in_person',
  location: 'قاعة 1',
  meetingUrl: null,
  presenter: null,
  url: 'https://x.test/en/events/7',
  titleLang: 'en',
}
const ICS = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'
const email = (to: string, withIcs = false) => ({
  to,
  subject: 'Cyber workshop',
  react: <EnConfirmation name="Ali Ahmed" event={event} cancelUrl="https://x.test/en/registrations/cancel?t=abc" />,
  headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  ...(withIcs ? { attachments: [{ filename: 'hisn-event-7.ics', content: ICS }] } : {}),
})

let messageIds = 0
beforeEach(() => {
  vi.clearAllMocks()
  mail.keys.length = 0
  messageIds = 0
  mail.createTransport.mockReturnValue({ sendMail: mail.sendMail })
  mail.sendMail.mockImplementation(async () => ({ messageId: `<m${++messageIds}@local>` }))
  mail.emailsSend.mockImplementation(async () => ({ data: { id: `single-${++messageIds}` }, error: null }))
  mail.batchSend.mockImplementation(async (payload: unknown[]) => ({ data: { data: payload.map((_, i) => ({ id: `batch-${i + 1}` })) }, error: null }))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

/* dev-2 D2-8 */
describe('sendEmail', () => {
  it('sends through SMTP (the local mail catcher) from Hisn, replying to the contact address', async () => {
    const { sendEmail, FROM } = await load()
    expect(FROM).toBe('حصن <noreply@hisn-sa.org>')
    expect(await sendEmail(email('a@x.com', true))).toStrictEqual({ id: '<m1@local>' })
    expect(mail.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: '127.0.0.1', port: 54325 }))
    const sent = mail.sendMail.mock.calls[0][0]
    expect(sent).toMatchObject({ from: FROM, replyTo: CONTACT_EMAIL, to: 'a@x.com', subject: 'Cyber workshop', headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    expect(sent.html).toContain('dir="ltr"')
    expect(sent.text).toContain('Ali Ahmed')
    expect(sent.attachments).toStrictEqual([{ filename: 'hisn-event-7.ics', content: ICS, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }])
  })

  it('sends nothing to an address outside EMAIL_ALLOWLIST (comma-separated, normalized)', async () => {
    const { sendEmail } = await load({ EMAIL_ALLOWLIST: ' A@x.com , b@x.com' })
    expect(await sendEmail(email('c@x.com'))).toStrictEqual({ skipped: true })
    expect(mail.sendMail).not.toHaveBeenCalled()
    expect(await sendEmail(email(' a@X.com'))).toStrictEqual({ id: '<m1@local>' })
  })

  it('sends through Resend, with the calendar file as binary content', async () => {
    const { sendEmail, FROM } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test' })
    expect(await sendEmail(email('a@x.com', true))).toStrictEqual({ id: 'single-1' })
    expect(mail.keys).toStrictEqual(['re_test'])
    const [payload] = mail.emailsSend.mock.calls[0]
    expect(payload).toMatchObject({ from: FROM, replyTo: CONTACT_EMAIL, to: 'a@x.com', subject: 'Cyber workshop', headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
    expect(payload.html).toContain('dir="ltr"')
    // Resend reads a string attachment as base64, so the .ics text goes as bytes
    expect(payload.attachments).toStrictEqual([{ filename: 'hisn-event-7.ics', content: Buffer.from(ICS, 'utf8'), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }])
  })

  it('throws when Resend answers with an error', async () => {
    const { sendEmail } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test' })
    mail.emailsSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad address' } })
    await expect(sendEmail(email('a@x.com'))).rejects.toThrow('bad address')
  })

  it('throws, naming the variable, when RESEND_API_KEY is missing', async () => {
    const { sendEmail } = await load({ EMAIL_TRANSPORT: 'resend' })
    await expect(sendEmail(email('a@x.com'))).rejects.toThrow('RESEND_API_KEY')
  })
})

describe('sendBatch', () => {
  it('sends one by one through SMTP; ids in order, empty for an address the allowlist holds back', async () => {
    const { sendBatch } = await load({ EMAIL_ALLOWLIST: 'a@x.com,c@x.com' })
    expect(await sendBatch([email('a@x.com'), email('b@x.com'), email('c@x.com')], 'k')).toStrictEqual({ ids: ['<m1@local>', '', '<m2@local>'] })
    expect(mail.sendMail).toHaveBeenCalledTimes(2)
  })

  it('sends through Resend\'s batch endpoint with the idempotency key', async () => {
    const { sendBatch } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test' })
    expect(await sendBatch([email('a@x.com'), email('b@x.com')], 'announcement-event-7-run-1-batch-1')).toStrictEqual({ ids: ['batch-1', 'batch-2'] })
    expect(mail.batchSend).toHaveBeenCalledTimes(1)
    const [payload, options] = mail.batchSend.mock.calls[0]
    expect(payload.map((m: { to: string }) => m.to)).toStrictEqual(['a@x.com', 'b@x.com'])
    expect(options).toStrictEqual({ idempotencyKey: 'announcement-event-7-run-1-batch-1' })
    expect(mail.emailsSend).not.toHaveBeenCalled()
  })

  // the batch endpoint takes no attachments (owner's decision: send those singly, keys derived from the batch key)
  it('sends an email with an attachment singly, with <batch key>-<n>, and the rest in the batch; ids in input order', async () => {
    const { sendBatch } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test' })
    const { ids } = await sendBatch([email('a@x.com'), email('b@x.com', true), email('c@x.com')], 'k')
    expect(ids).toStrictEqual(['batch-1', 'single-1', 'batch-2'])
    expect(mail.emailsSend).toHaveBeenCalledTimes(1)
    expect(mail.emailsSend.mock.calls[0][0].to).toBe('b@x.com')
    expect(mail.emailsSend.mock.calls[0][1]).toStrictEqual({ idempotencyKey: 'k-2' })
    expect(mail.batchSend.mock.calls[0][0].map((m: { to: string }) => m.to)).toStrictEqual(['a@x.com', 'c@x.com'])
    expect(mail.batchSend.mock.calls[0][0].every((m: { attachments?: unknown }) => m.attachments === undefined)).toBe(true)
  })

  it('holds back addresses outside the allowlist in a Resend batch, and calls nothing when none is left', async () => {
    const { sendBatch } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test', EMAIL_ALLOWLIST: 'b@x.com' })
    expect(await sendBatch([email('a@x.com'), email('b@x.com')], 'k')).toStrictEqual({ ids: ['', 'batch-1'] })
    expect(mail.batchSend.mock.calls[0][0].map((m: { to: string }) => m.to)).toStrictEqual(['b@x.com'])
    vi.clearAllMocks()
    expect(await sendBatch([email('a@x.com')], 'k')).toStrictEqual({ ids: [''] })
    expect(mail.batchSend).not.toHaveBeenCalled()
    expect(mail.emailsSend).not.toHaveBeenCalled()
  })

  it('throws when Resend refuses the batch', async () => {
    const { sendBatch } = await load({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_test' })
    mail.batchSend.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'too many' } })
    await expect(sendBatch([email('a@x.com')], 'k')).rejects.toThrow('too many')
  })
})
