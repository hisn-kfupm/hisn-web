// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const SECRET = 'local-test-secret-0123456789abcdef0123'

// serverEnv() checks the whole server environment, so the tests set a valid one, not only TOKEN_SECRET.
const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  EMAIL_TRANSPORT: 'smtp',
  SITE_URL: 'http://localhost:3000',
  CRON_SECRET: 'local-cron',
}

/** A fresh lib/tokens/sign.ts that signs with `secret` (serverEnv() caches what it reads first). */
async function loadTokens(secret = SECRET) {
  vi.resetModules()
  for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value)
  vi.stubEnv('TOKEN_SECRET', secret)
  return import('@/lib/tokens/sign')
}

/** Signs any text in the documented format: base64url(text) + '.' + base64url(HMAC-SHA256(secret, first part)). */
function signRaw(text: string, secret = SECRET): string {
  const body = Buffer.from(text, 'utf8').toString('base64url')
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`
}

/** Signs a payload by hand, so a test can sign shapes that signToken's type does not allow. */
const signByHand = (payload: unknown) => signRaw(JSON.stringify(payload))

/** `token` with one character of one part (0 = payload, 1 = signature) replaced, once for every position. */
function oneCharEdits(token: string, part: 0 | 1): string[] {
  const parts = token.split('.')
  const text = parts[part]
  return [...text].map((char, i) => {
    const edited = [...parts]
    edited[part] = text.slice(0, i) + (char === 'A' ? 'B' : 'A') + text.slice(i + 1)
    return edited.join('.')
  })
}

const nowSeconds = () => Math.floor(Date.now() / 1000)
const INVALID = { ok: false, reason: 'invalid' }
const EXPIRED = { ok: false, reason: 'expired' }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

/* Spec §8.5. The cases listed in docs/tasks/dev-2.md D2-1. */
describe('signToken and verifyToken', () => {
  it('round-trips an unsubscribe token', async () => {
    const { signToken, verifyToken } = await loadTokens()
    expect(verifyToken(signToken({ kind: 'unsub', sub: 'a@b.com' }), 'unsub')).toStrictEqual({ sub: 'a@b.com' })
  })

  it('returns null when one character of the payload part is changed', async () => {
    const { signToken, verifyToken } = await loadTokens()
    const edits = oneCharEdits(signToken({ kind: 'unsub', sub: 'a@b.com' }), 0)
    for (const tampered of edits) expect(verifyToken(tampered, 'unsub')).toBeNull()
  })

  it('reports a cancel token whose exp has passed as expired', async () => {
    const { signToken, verifyToken, verifyTokenDetailed } = await loadTokens()
    const token = signToken({ kind: 'cancel', sub: '42', ver: 2, exp: nowSeconds() - 1 })
    expect(verifyToken(token, 'cancel')).toBeNull()
    expect(verifyTokenDetailed(token, 'cancel')).toStrictEqual(EXPIRED)
  })

  it('verifies a cancel token before its exp to the registration id and version', async () => {
    const { signToken, verifyToken, verifyTokenDetailed } = await loadTokens()
    const token = signToken({ kind: 'cancel', sub: '42', ver: 2, exp: nowSeconds() + 3600 })
    expect(verifyToken(token, 'cancel')).toStrictEqual({ sub: '42', ver: 2 })
    expect(verifyTokenDetailed(token, 'cancel')).toStrictEqual({ ok: true, sub: '42', ver: 2 })
  })

  it('rejects a cancel payload without ver, built and signed by hand, as invalid', async () => {
    const { verifyToken, verifyTokenDetailed } = await loadTokens()
    const exp = nowSeconds() + 3600
    // The hand signer matches the real format: the same payload with a ver verifies.
    expect(verifyTokenDetailed(signByHand({ kind: 'cancel', sub: '42', ver: 2, exp }), 'cancel')).toStrictEqual({ ok: true, sub: '42', ver: 2 })

    const withoutVer = signByHand({ kind: 'cancel', sub: '42', exp })
    expect(verifyTokenDetailed(withoutVer, 'cancel')).toStrictEqual(INVALID)
    expect(verifyToken(withoutVer, 'cancel')).toBeNull()
  })

  it('rejects a token of the other kind as invalid', async () => {
    const { signToken, verifyToken, verifyTokenDetailed } = await loadTokens()
    const unsub = signToken({ kind: 'unsub', sub: 'a@b.com' })
    expect(verifyToken(unsub, 'cancel')).toBeNull()
    expect(verifyTokenDetailed(unsub, 'cancel')).toStrictEqual(INVALID)

    const cancel = signToken({ kind: 'cancel', sub: '42', ver: 2, exp: nowSeconds() + 3600 })
    expect(verifyTokenDetailed(cancel, 'unsub')).toStrictEqual(INVALID)
  })

  it("returns null for 'abc'", async () => {
    const { verifyToken } = await loadTokens()
    expect(verifyToken('abc', 'unsub')).toBeNull()
  })

  it('returns null when verified with a different TOKEN_SECRET', async () => {
    const signer = await loadTokens('x'.repeat(32))
    const token = signer.signToken({ kind: 'unsub', sub: 'a@b.com' })
    expect(signer.verifyToken(token, 'unsub')).toStrictEqual({ sub: 'a@b.com' })

    const verifier = await loadTokens('y'.repeat(32))
    expect(verifier.verifyToken(token, 'unsub')).toBeNull()
  })
})

/* Rules the task states without listing a test for them. */
describe('verification rules', () => {
  it('rejects every one-character change to the signature part', async () => {
    const { signToken, verifyTokenDetailed } = await loadTokens()
    const edits = oneCharEdits(signToken({ kind: 'unsub', sub: 'a@b.com' }), 1)
    for (const tampered of edits) expect(verifyTokenDetailed(tampered, 'unsub')).toStrictEqual(INVALID)
  })

  it('rejects another spelling of the same signature bytes', async () => {
    const { signToken, verifyTokenDetailed } = await loadTokens()
    const [body, sig] = signToken({ kind: 'unsub', sub: 'a@b.com' }).split('.')
    // 32 bytes take 43 base64url characters, 258 bits: the last character's 2 low bits are padding.
    const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    const flippedPadding = sig.slice(0, -1) + BASE64URL[BASE64URL.indexOf(sig.slice(-1)) ^ 1]

    for (const respelled of [flippedPadding, `${sig}=`]) {
      expect(Buffer.from(respelled, 'base64url').equals(Buffer.from(sig, 'base64url'))).toBe(true)
      expect(verifyTokenDetailed(`${body}.${respelled}`, 'unsub')).toStrictEqual(INVALID)
    }
  })

  it('treats exp equal to the current second as expired, and the next second as valid', async () => {
    const { signToken, verifyTokenDetailed } = await loadTokens()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-25T12:00:00.500Z'))
    const now = Math.floor(Date.parse('2026-11-25T12:00:00Z') / 1000)

    expect(verifyTokenDetailed(signToken({ kind: 'cancel', sub: '42', ver: 1, exp: now }), 'cancel')).toStrictEqual(EXPIRED)
    expect(verifyTokenDetailed(signToken({ kind: 'cancel', sub: '42', ver: 1, exp: now + 1 }), 'cancel')).toStrictEqual({ ok: true, sub: '42', ver: 1 })
  })

  it.each([0, -1, 1.5, '2', null])('rejects a cancel token with ver %j as invalid', async (ver) => {
    const { verifyTokenDetailed } = await loadTokens()
    const token = signByHand({ kind: 'cancel', sub: '42', ver, exp: nowSeconds() + 3600 })
    expect(verifyTokenDetailed(token, 'cancel')).toStrictEqual(INVALID)
  })

  it.each(['', '.', 'abc.', '.abc', 'a.b.c'])('rejects %j as invalid', async (bad) => {
    const { verifyTokenDetailed } = await loadTokens()
    expect(verifyTokenDetailed(bad, 'unsub')).toStrictEqual(INVALID)
  })
})

/*
  Not spelled out in the task; read as "bad format" (a payload that does not match TokenPayload).
  Without these, a signed cancel token with no usable exp would never expire.
*/
describe('payloads that do not match TokenPayload', () => {
  it.each([
    ['text that is not JSON', signRaw('not json')],
    ['JSON null', signRaw('null')],
    ['a JSON array', signRaw('[]')],
    ['a JSON string', signRaw('"a@b.com"')],
    ['an unsub payload without sub', signByHand({ kind: 'unsub' })],
    ['an unsub payload whose sub is a number', signByHand({ kind: 'unsub', sub: 7 })],
  ])('rejects %s as invalid', async (_, token) => {
    const { verifyTokenDetailed } = await loadTokens()
    expect(verifyTokenDetailed(token, 'unsub')).toStrictEqual(INVALID)
  })

  it.each([
    ['without exp', signByHand({ kind: 'cancel', sub: '42', ver: 2 })],
    ['with exp as a string', signByHand({ kind: 'cancel', sub: '42', ver: 2, exp: '9999999999' })],
    ['with exp that parses to Infinity', signRaw('{"kind":"cancel","sub":"42","ver":2,"exp":1e999}')],
  ])('rejects a cancel token %s as invalid', async (_, token) => {
    const { verifyTokenDetailed } = await loadTokens()
    expect(verifyTokenDetailed(token, 'cancel')).toStrictEqual(INVALID)
  })

  it('reports a malformed cancel token as invalid even when its exp has passed', async () => {
    const { verifyTokenDetailed } = await loadTokens()
    const token = signByHand({ kind: 'cancel', sub: '42', exp: nowSeconds() - 1 })
    expect(verifyTokenDetailed(token, 'cancel')).toStrictEqual(INVALID)
  })
})
