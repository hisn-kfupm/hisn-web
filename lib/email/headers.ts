import { normalizeEmail } from '@/lib/email/normalize'
import { serverEnv } from '@/lib/env'
import { signToken } from '@/lib/tokens/sign'

/**
 * The two RFC 8058 headers every announcement carries (dev-2 D2-2, spec §10.4). Mail clients POST to the
 * one-click endpoint, which has no language, like the token; only the unsubscribe link in the email body
 * carries the delivery's locale (D2-8).
 */
export function unsubscribeHeaders(email: string): Record<'List-Unsubscribe' | 'List-Unsubscribe-Post', string> {
  const site = serverEnv().SITE_URL.replace(/\/+$/, '')
  const token = signToken({ kind: 'unsub', sub: normalizeEmail(email) })
  return {
    'List-Unsubscribe': `<${site}/api/unsubscribe?t=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
