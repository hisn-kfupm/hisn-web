import { describe, expect, it } from 'vitest'
import { afterCancel, afterJoin, afterRegister } from '@/lib/events/register-flow'
import { readMyStatus, readWaitlistPosition, myStatus, myWaitlistPosition } from '@/lib/events/mine'

/* dev-1 D1-11: what the button shows after each action, and the own-status readers */
const open = { state: 'open' as const, position: null }

describe('register flow', () => {
  it('register: registered (or already) → registered; needsProfile and profile_required → the gate', () => {
    expect(afterRegister('registered', open)).toMatchObject({ state: 'registered' })
    expect(afterRegister('already_registered', open)).toMatchObject({ state: 'registered' })
    expect(afterRegister({ needsProfile: true }, open)).toEqual({ gate: true })
    expect(afterRegister('profile_required', open)).toEqual({ gate: true })
  })

  it('register: a race to full, closed or cancelled shows that state; not_found keeps the state with a notice', () => {
    expect(afterRegister('full', open)).toMatchObject({ state: 'full' })
    expect(afterRegister('closed', open)).toMatchObject({ state: 'closed' })
    expect(afterRegister('not_found', open)).toMatchObject({ state: 'open', notice: 'notFound' })
  })

  it('join: waitlisted with its position; not_full reopens', () => {
    const full = { state: 'full' as const, position: null }
    expect(afterJoin({ result: 'waitlisted', position: 4 }, full)).toMatchObject({ state: 'waitlisted', position: 4 })
    expect(afterJoin({ result: 'not_full' }, full, 'open_almost_full')).toMatchObject({ state: 'open_almost_full' })
    expect(afterJoin({ needsProfile: true }, full)).toEqual({ gate: true })
  })

  it('cancel: a registration reopens, a waitlist place goes back to full, started keeps it', () => {
    expect(afterCancel('cancelled', { state: 'registered', position: null }, 'open_almost_full')).toMatchObject({ state: 'open_almost_full' })
    expect(afterCancel('cancelled', { state: 'waitlisted', position: 2 })).toMatchObject({ state: 'full', position: null })
    expect(afterCancel('started', { state: 'registered', position: null })).toMatchObject({ state: 'registered', notice: 'started' })
  })
})

describe('mine', () => {
  it('readMyStatus: registered and waitlisted pass, cancelled and no row are null, errors throw', () => {
    expect(readMyStatus({ data: { status: 'registered' }, error: null })).toBe('registered')
    expect(readMyStatus({ data: { status: 'waitlisted' }, error: null })).toBe('waitlisted')
    expect(readMyStatus({ data: { status: 'cancelled' }, error: null })).toBeNull()
    expect(readMyStatus({ data: null, error: null })).toBeNull()
    expect(() => readMyStatus({ data: null, error: { code: '42501', message: 'denied' } })).toThrow()
  })

  it("readWaitlistPosition: error '42883' → null; other errors throw; data passes", () => {
    expect(readWaitlistPosition({ data: null, error: { code: '42883', message: 'function does not exist' } })).toBeNull()
    expect(() => readWaitlistPosition({ data: null, error: { code: 'XX000', message: 'boom' } })).toThrow()
    expect(readWaitlistPosition({ data: 3, error: null })).toBe(3)
  })

  it('stand-in: no session yet, so no status and no position', async () => {
    expect(await myStatus(9001)).toBeNull()
    expect(await myWaitlistPosition(9001)).toBeNull()
  })
})
