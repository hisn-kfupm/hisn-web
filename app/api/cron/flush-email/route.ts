import { createHash, timingSafeEqual } from 'node:crypto'
import { flushStale } from '@/lib/email/outbox'
import { serverEnv } from '@/lib/env'
import { reportError } from '@/lib/monitoring/report'

/*
  Vercel Cron, every 10 minutes (vercel.json): sends the emails an action left queued for more than 2 minutes
  (dev-2 D2-8, spec §10.3). Vercel sends Authorization: Bearer <CRON_SECRET>; anything else gets 401.
*/

/** the two values compared in constant time (hashed first, so their lengths match) */
const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization')
  if (authorization === null || !same(authorization, `Bearer ${serverEnv().CRON_SECRET}`)) return new Response(null, { status: 401 })
  try {
    return Response.json(await flushStale())
  } catch (thrown) {
    reportError(thrown, { level: 'error', tags: { alert: 'cron' } })
    return new Response(null, { status: 500 })
  }
}
