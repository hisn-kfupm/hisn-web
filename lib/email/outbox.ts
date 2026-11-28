import 'server-only'
import { supabaseProdService } from '@/lib/db/prod'
import { renderDelivery } from '@/lib/email/render'
import { sendEmail } from '@/lib/email/send'
import type { DeliveryKind } from '@/lib/email/types'
import type { Locale } from '@/lib/i18n/locale'
import { reportError } from '@/lib/monitoring/report'

/*
  The outbox (dev-2 D2-8, spec §10.3): every email is first a queued email_deliveries row, written in the same
  transaction as the action. The action sends its rows right after (flushOutboxFor, flushQueuedForEvent), and
  the cron sends what was left behind (flushStale). Only the four transactional kinds are sent here; the
  announcement and the cancelled and changed notices go in batches (D2-14).
*/

export type DeliveryRow = {
  id: number
  event_id: number | null
  registration_id: number | null
  kind: DeliveryKind
  email: string
  locale: Locale
  status: 'queued' | 'sent' | 'failed' | 'skipped'
  batch_key: string | null
  created_at: string
  attempted_at: string | null
}

const TRANSACTIONAL: DeliveryKind[] = ['confirmation', 'promoted', 'waitlist_joined', 'cancel_confirmation']
const COLUMNS = 'id, event_id, registration_id, kind, email, locale, status, batch_key, created_at, attempted_at'
/** a claimed row whose sender stopped before finishing is free again after this long */
const CLAIM_MINUTES = 5
/** the most rows one call sends; the cron picks up the rest */
const LIMIT = 100

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

type Filter = { registrationIds: number[] } | { eventId: number } | { createdBefore: string }

/** ids of queued transactional rows, oldest first */
async function queuedIds(filter: Filter): Promise<number[]> {
  let query = supabaseProdService().from('email_deliveries').select('id').eq('status', 'queued').in('kind', TRANSACTIONAL)
  if ('registrationIds' in filter) query = query.in('registration_id', filter.registrationIds)
  else if ('eventId' in filter) query = query.eq('event_id', filter.eventId)
  else query = query.lt('created_at', filter.createdBefore)
  const { data, error } = await query.order('id').limit(LIMIT)
  if (error) throw error
  return data.map((row) => row.id as number)
}

/**
 * Claims rows before sending, so the action and the cron never send the same row twice: sets attempted_at on
 * those still queued and not claimed in the last 5 minutes, and returns only the rows this call got. A second
 * claim of the same row waits for the first, then no longer matches.
 */
async function claim(ids: number[]): Promise<DeliveryRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabaseProdService()
    .from('email_deliveries')
    .update({ attempted_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'queued')
    .or(`attempted_at.is.null,attempted_at.lt."${minutesAgo(CLAIM_MINUTES)}"`)
    .select(COLUMNS)
  if (error) throw error
  return (data as DeliveryRow[]).sort((a, b) => a.id - b.id)
}

/**
 * The error, as text the row can store: the first 500 characters (never half of one), with lone surrogates and NUL
 * removed. Postgres refuses those, and a refused update would leave the row queued, to be sent again.
 */
const errorText = (thrown: unknown) =>
  Array.from((thrown instanceof Error ? thrown.message : String(thrown)).toWellFormed().replace(/\u0000/g, ''))
    .slice(0, 500)
    .join('')

/** Sends claimed rows one by one, in order, and records each result. A failure is recorded and reported. */
async function send(rows: DeliveryRow[]): Promise<{ sent: number; failed: number }> {
  const db = supabaseProdService()
  let sent = 0
  let failed = 0
  for (const row of rows) {
    let result: { status: 'sent'; provider_message_id: string } | { status: 'skipped' } | { status: 'failed'; error: string }
    try {
      const outcome = await sendEmail(await renderDelivery(row))
      result = 'id' in outcome ? { status: 'sent', provider_message_id: outcome.id } : { status: 'skipped' }
    } catch (thrown) {
      reportError(thrown, { level: 'error', tags: { kind: row.kind } })
      result = { status: 'failed', error: errorText(thrown) }
    }
    if (result.status === 'sent') sent++
    if (result.status === 'failed') failed++
    const { error } = await db.from('email_deliveries').update(result).eq('id', row.id)
    if (error) reportError(error, { level: 'error', tags: { kind: row.kind } })
  }
  return { sent, failed }
}

/** sends the queued rows of these registrations (an action's own emails) */
export async function flushOutboxFor(registrationIds: number[]): Promise<void> {
  if (registrationIds.length === 0) return
  await send(await claim(await queuedIds({ registrationIds })))
}

/** sends the queued rows of one event, however new: an action calls it right after its database function */
export async function flushQueuedForEvent(eventId: number): Promise<void> {
  await send(await claim(await queuedIds({ eventId })))
}

/** the cron's job: sends the rows queued more than `olderThanMinutes` ago that no action sent */
export async function flushStale(olderThanMinutes = 2): Promise<{ sent: number; failed: number }> {
  return send(await claim(await queuedIds({ createdBefore: minutesAgo(olderThanMinutes) })))
}
