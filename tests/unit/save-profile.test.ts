// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// A profile store with no database, for what tests/db can't make happen: the auth API failing.
const fake = vi.hoisted(() => {
  const state = { existing: null as Record<string, unknown> | null, insertError: null as { code: string; message: string } | null }
  const profiles = {
    select: () => profiles,
    eq: () => profiles,
    maybeSingle: async () => ({ data: state.existing, error: null }),
    insert: async () => ({ error: state.insertError }),
    update: () => ({ eq: async () => ({ error: null }) }),
  }
  return { state, client: { from: () => profiles }, updateUserById: vi.fn() }
})
vi.mock('@/lib/db/prod', () => ({
  supabaseProdServer: async () => fake.client,
  supabaseProdService: () => ({ auth: { admin: { updateUserById: fake.updateUserById } } }),
}))
vi.mock('@/lib/auth/session', () => ({ getSession: async () => ({ userId: 'u1', email: 'a@b.com' }) }))
vi.mock('@/lib/profile/announcements', () => ({ applyAnnouncementChoice: vi.fn() }))
vi.mock('@/lib/monitoring/report', () => ({ reportError: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { saveProfile } from '@/app/account/actions'
import { reportError } from '@/lib/monitoring/report'
import type { ProfileInput } from '@/lib/profile/schema'

const input: ProfileInput = { full_name_ar: 'سارة أحمد', major_code: 'SWE', academic_level_code: 'BACHELOR', gender: 'female', announcements_opt_in: false, locale: 'en' }

beforeEach(() => {
  vi.clearAllMocks()
  fake.state.existing = null
  fake.state.insertError = null
  fake.updateUserById.mockResolvedValue({ data: {}, error: null })
})

/* dev-2 D2-6: the email language is mirrored into auth, and a failure there does not fail the save */
describe('saveProfile, mirroring the email language', () => {
  it('reports an error answer from the auth API and still saves', async () => {
    const error = new Error('auth down')
    fake.updateUserById.mockResolvedValue({ data: null, error })
    expect(await saveProfile(input)).toStrictEqual({ ok: true })
    expect(fake.updateUserById).toHaveBeenCalledWith('u1', { user_metadata: { locale: 'en' } })
    expect(reportError).toHaveBeenCalledWith(error, { level: 'error' })
  })

  it('reports a thrown failure and still saves', async () => {
    const thrown = new Error('network')
    fake.updateUserById.mockRejectedValue(thrown)
    expect(await saveProfile(input)).toStrictEqual({ ok: true })
    expect(reportError).toHaveBeenCalledWith(thrown, { level: 'error' })
  })

  // so a mirror that failed once is repaired by the next save, even one in the same language
  it('mirrors on every save', async () => {
    fake.state.existing = { announcements_opt_in: false }
    await saveProfile(input)
    expect(fake.updateUserById).toHaveBeenCalledWith('u1', { user_metadata: { locale: 'en' } })
  })
})

describe('saveProfile, when the profile write fails', () => {
  it('reports it, rethrows it, and mirrors nothing', async () => {
    fake.state.insertError = { code: '57014', message: 'canceled' }
    await expect(saveProfile(input)).rejects.toBe(fake.state.insertError)
    expect(reportError).toHaveBeenCalledWith(fake.state.insertError, { level: 'error' })
    expect(fake.updateUserById).not.toHaveBeenCalled()
  })
})
