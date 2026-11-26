import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { serverEnv } from '@/lib/env'

/*
  The signed tokens in email links (spec §8.5): unsubscribe, and cancel a registration or waitlist place.
  Format: base64url(JSON.stringify(payload)) + '.' + base64url(HMAC-SHA256(TOKEN_SECRET, first part)).
  A token carries no language; the link's path does (/ar/… or /en/…).
*/

export type TokenPayload =
  | { kind: 'unsub'; sub: string } // sub = normalized email; no expiry
  | { kind: 'cancel'; sub: string; ver: number; exp: number }
// cancel: sub = registration id as string; ver = registrations.registration_version; exp = Unix SECONDS (event start)

type VerifyResult = { ok: true; sub: string; ver?: number } | { ok: false; reason: 'invalid' | 'expired' }

const invalid = (): VerifyResult => ({ ok: false, reason: 'invalid' })

function signature(body: string): string {
  return createHmac('sha256', serverEnv().TOKEN_SECRET).update(body).digest('base64url')
}

export function signToken(p: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(p), 'utf8').toString('base64url')
  return `${body}.${signature(body)}`
}

/**
 * Compares the encoded signatures rather than the decoded bytes: base64url decoding is lenient, so
 * comparing bytes would let several spellings of one signature pass. Each token has exactly one.
 */
function sameSignature(given: string, expected: string): boolean {
  const a = Buffer.from(given, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** the payload part as a JSON object, or null */
function decode(body: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Bad format, bad signature, wrong kind, or a payload that does not match TokenPayload (a cancel
 * token needs an integer ver ≥ 1 and a finite numeric exp) → 'invalid'. Only a well-formed cancel token can
 * be 'expired': exp <= the current Unix second.
 */
export function verifyTokenDetailed(t: string, kind: 'unsub' | 'cancel'): VerifyResult {
  const parts = t.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return invalid()
  const [body, sig] = parts
  if (!sameSignature(sig, signature(body))) return invalid()

  const payload = decode(body)
  if (!payload || payload.kind !== kind || typeof payload.sub !== 'string') return invalid()
  if (kind === 'unsub') return { ok: true, sub: payload.sub }

  const { ver, exp } = payload
  if (typeof ver !== 'number' || !Number.isInteger(ver) || ver < 1) return invalid()
  // Without a finite exp the token would never expire.
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return invalid()
  if (exp <= Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' }
  return { ok: true, sub: payload.sub, ver }
}

/** verifyTokenDetailed without the reason: null for any failure; ver only for cancel tokens */
export function verifyToken(t: string, kind: 'unsub' | 'cancel'): { sub: string; ver?: number } | null {
  const result = verifyTokenDetailed(t, kind)
  if (!result.ok) return null
  return result.ver === undefined ? { sub: result.sub } : { sub: result.sub, ver: result.ver }
}
