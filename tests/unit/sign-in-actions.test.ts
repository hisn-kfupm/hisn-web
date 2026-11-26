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

  // a 429 is also the project's hourly email cap, which stops everyone: reported, but not as fatal
  it('reports too many requests as rate_limited, with a non-fatal report', async () => {
    const error = { status: 429, message: 'rate limit' }
    auth.signInWithOtp.mockResolvedValue({ data: {}, error })
    expect(await sendCode('a@gmail.com', 'ar')).toStrictEqual({ ok: false, reason: 'rate_limited' })
    expect(reportError).toHaveBeenCalledWith(error, { level: 'error', tags: { alert: 'sign-in' } })
  })

  it('treats a crash on the server as send_failed, with a fatal sign-in alert', async () => {
    const thrown = new Error('Invalid server environment: CRON_SECRET')
    auth.signInWithOtp.mockRejectedValue(thrown)
    expect(await sendCode('a@gmail.com', 'ar')).toStrictEqual({ ok: false, reason: 'send_failed' })
    expect(reportError).toHaveBeenCalledWith(thrown, { level: 'fatal', tags: { alert: 'sign-in' } })
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

  // Supabase answers a wrong code like this too (checked against local Supabase), hence the copy
  it('reads Supabase\'s answer to a wrong or expired code as expired', async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } })
    expect(await verifyCode('a@gmail.com', '123456')).toStrictEqual({ ok: false, reason: 'expired' })
  })

  it('accepts a code typed on an Arabic keypad', async () => {
    await verifyCode('a@gmail.com', '١٢٣٤٥٦', '/ar')
    expect(auth.verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ token: '123456' }))
  })

  // an outage is not a wrong code: reported, and thrown so the form says the code could not be checked
  it.each([
    [0, 'fatal'],
    [503, 'fatal'],
    [429, 'error'],
  ])('throws and reports when Supabase cannot check the code (status %i)', async (status, level) => {
    const error = { status, message: 'unavailable' }
    auth.verifyOtp.mockResolvedValue({ data: {}, error })
    await expect(verifyCode('a@gmail.com', '123456')).rejects.toThrow()
    expect(reportError).toHaveBeenCalledWith(error, { level, tags: { alert: 'sign-in' } })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('reports and rethrows a crash while checking', async () => {
    const thrown = new Error('An error occurred on token verification.')
    auth.verifyOtp.mockRejectedValue(thrown)
    await expect(verifyCode('a@gmail.com', '123456')).rejects.toBe(thrown)
    expect(reportError).toHaveBeenCalledWith(thrown, { level: 'fatal', tags: { alert: 'sign-in' } })
  })

  it('returns to the page the person came from, same-site only', async () => {
    for (const [returnTo, target] of [['//evil.com', '/'], ['/events/3', '/events/3'], ['/en/events/3', '/en/events/3']]) {
      vi.mocked(redirect).mockClear()
      await verifyCode('a@gmail.com', '123456', returnTo)
      expect(redirect, returnTo).toHaveBeenCalledWith(target)
    }
  })
})
