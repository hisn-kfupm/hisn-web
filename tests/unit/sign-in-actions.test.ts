// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/lib/i18n/locale'

const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn() }))
vi.mock('@/lib/db/prod', () => ({ supabaseProdServer: async () => ({ auth }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/monitoring/report', () => ({ reportError: vi.fn() }))

import { redirect } from 'next/navigation'
import { reportError } from '@/lib/monitoring/report'
import { sendCode, verifyCode } from '@/app/sign-in/actions'

beforeEach(() => {
  vi.clearAllMocks()
  auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })
  auth.verifyOtp.mockResolvedValue({ data: { user: {}, session: {} }, error: null })
})

/* dev-2 D2-5, spec §7.1 */
describe('sendCode', () => {
  it('rejects something that is not an email without asking Supabase', async () => {
    expect(await sendCode('bad', 'ar')).toStrictEqual({ ok: false, reason: 'invalid' })
    expect(auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends to the normalized address, creating the account, with the page language', async () => {
    expect(await sendCode(' A@Gmail.com ', 'ar')).toStrictEqual({ ok: true })
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'a@gmail.com', options: { shouldCreateUser: true, data: { locale: 'ar' } } })
  })

  it('asks for the English code email from /en', async () => {
    await sendCode('a@gmail.com', 'en')
    expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ options: { shouldCreateUser: true, data: { locale: 'en' } } }))
  })

  it('reports too many requests as rate_limited, without an alert', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: { status: 429, message: 'rate limit' } })
    expect(await sendCode('a@gmail.com', 'ar')).toStrictEqual({ ok: false, reason: 'rate_limited' })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports any other failure as send_failed, with a fatal sign-in alert', async () => {
    const error = { status: 500, message: 'smtp down' }
    auth.signInWithOtp.mockResolvedValue({ data: {}, error })
    expect(await sendCode('a@gmail.com', 'ar')).toStrictEqual({ ok: false, reason: 'send_failed' })
    expect(reportError).toHaveBeenCalledWith(error, { level: 'fatal', tags: { alert: 'sign-in' } })
  })

  // A server action's arguments come from the browser: only a known locale goes into the account.
  it('stores Arabic for a locale that is not ours', async () => {
    await sendCode('a@gmail.com', 'fr' as Locale)
    expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ options: { shouldCreateUser: true, data: { locale: 'ar' } } }))
  })
})

describe('verifyCode', () => {
  it('checks the code against the normalized address', async () => {
    await verifyCode(' A@Gmail.com ', '123456', '/events/3')
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'a@gmail.com', token: '123456', type: 'email' })
  })

  it('reads an expired code as expired', async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } })
    expect(await verifyCode('a@gmail.com', '123456')).toStrictEqual({ ok: false, reason: 'expired' })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('reads any other error as a wrong code', async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Invalid token' } })
    expect(await verifyCode('a@gmail.com', '123456')).toStrictEqual({ ok: false, reason: 'wrong' })
  })

  it('returns to the page the person came from, same-site only', async () => {
    for (const [returnTo, target] of [['//evil.com', '/'], ['/events/3', '/events/3'], ['/en/events/3', '/en/events/3']]) {
      vi.mocked(redirect).mockClear()
      await verifyCode('a@gmail.com', '123456', returnTo)
      expect(redirect, returnTo).toHaveBeenCalledWith(target)
    }
  })
})
