import 'server-only'
import type { ReactElement } from 'react'
import { render } from '@react-email/render'
import nodemailer, { type Transporter } from 'nodemailer'
import { Resend } from 'resend'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import { normalizeEmail } from '@/lib/email/normalize'
import { serverEnv } from '@/lib/env'

/*
  Sends email (dev-2 D2-8, spec §10.3 and §10.5): EMAIL_TRANSPORT=smtp sends to the local mail catcher
  (locally and in CI), EMAIL_TRANSPORT=resend through Resend. When EMAIL_ALLOWLIST is set (previews), only
  those addresses get mail. Every email has an html and a plain-text body.
*/

export type OutgoingEmail = {
  to: string
  subject: string
  react: ReactElement
  headers?: Record<string, string>
  attachments?: { filename: string; content: string }[]
}

export const FROM = 'حصن <noreply@hisn-sa.org>'

/** an .ics file is a calendar entry, so mail clients offer to add it */
const contentType = (filename: string) => (filename.endsWith('.ics') ? { contentType: 'text/calendar; charset=utf-8; method=PUBLISH' } : {})

/** EMAIL_ALLOWLIST: comma-separated addresses, compared normalized; unset → everyone */
function allowed(to: string): boolean {
  const list = serverEnv().EMAIL_ALLOWLIST
  if (!list) return true
  return list.split(',').map(normalizeEmail).filter(Boolean).includes(normalizeEmail(to))
}

async function bodies(m: OutgoingEmail): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(m.react), render(m.react, { plainText: true })])
  return { html, text }
}

let smtp: Transporter | undefined
function smtpTransport(): Transporter {
  const { SMTP_HOST, SMTP_PORT } = serverEnv()
  smtp ??= nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT })
  return smtp
}

let resendClient: Resend | undefined
function resend(): Resend {
  const key = serverEnv().RESEND_API_KEY
  if (!key) throw new Error('EMAIL_TRANSPORT=resend needs RESEND_API_KEY')
  resendClient ??= new Resend(key)
  return resendClient
}

/** the provider's message id */
async function viaSmtp(m: OutgoingEmail): Promise<string> {
  const { html, text } = await bodies(m)
  const info = await smtpTransport().sendMail({
    from: FROM,
    replyTo: CONTACT_EMAIL,
    to: m.to,
    subject: m.subject,
    html,
    text,
    headers: m.headers,
    attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.content, ...contentType(a.filename) })),
  })
  return info.messageId
}

async function resendPayload(m: OutgoingEmail) {
  const { html, text } = await bodies(m)
  return {
    from: FROM,
    replyTo: CONTACT_EMAIL,
    to: m.to,
    subject: m.subject,
    html,
    text,
    headers: m.headers,
    // Resend reads a string attachment as base64, so the text goes as bytes
    ...(m.attachments?.length
      ? { attachments: m.attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, 'utf8'), ...contentType(a.filename) })) }
      : {}),
  }
}

/** Resend's email id */
async function viaResend(m: OutgoingEmail, idempotencyKey?: string): Promise<string> {
  const { data, error } = await resend().emails.send(await resendPayload(m), idempotencyKey ? { idempotencyKey } : undefined)
  if (error || !data) throw new Error(`Resend: ${error?.message ?? 'no email id'}`)
  return data.id
}

/** One email, from حصن, replying to the contact address; { skipped: true } when the allowlist holds it back. */
export async function sendEmail(m: OutgoingEmail): Promise<{ id: string } | { skipped: true }> {
  if (!allowed(m.to)) return { skipped: true }
  return { id: serverEnv().EMAIL_TRANSPORT === 'smtp' ? await viaSmtp(m) : await viaResend(m) }
}

/**
 * Emails under one idempotency key (D2-14's batches); ids in the input's order, '' for an email the allowlist
 * holds back. SMTP sends them one by one. Resend's batch endpoint takes no attachments, so an email with one is
 * sent singly with the key `${idempotencyKey}-${n}` (n = its place in the batch, from 1), which a retry of the
 * same batch repeats; the rest go in one batch call with the key itself.
 */
export async function sendBatch(ms: OutgoingEmail[], idempotencyKey: string): Promise<{ ids: string[] }> {
  const ids = ms.map(() => '')
  const sending = ms.flatMap((m, i) => (allowed(m.to) ? [i] : []))
  if (serverEnv().EMAIL_TRANSPORT === 'smtp') {
    for (const i of sending) ids[i] = await viaSmtp(ms[i])
    return { ids }
  }
  const single = sending.filter((i) => ms[i].attachments?.length)
  const batched = sending.filter((i) => !ms[i].attachments?.length)
  for (const i of single) ids[i] = await viaResend(ms[i], `${idempotencyKey}-${i + 1}`)
  if (batched.length > 0) {
    const payload = await Promise.all(batched.map((i) => resendPayload(ms[i])))
    const { data, error } = await resend().batch.send(payload, { idempotencyKey })
    if (error || !data) throw new Error(`Resend: ${error?.message ?? 'no email ids'}`)
    data.data.forEach((sent, k) => (ids[batched[k]] = sent.id))
  }
  return { ids }
}
