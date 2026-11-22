import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterBlock } from '@/components/event/RegisterBlock'
import { wallBricks } from '@/components/event/SeatWall'
import { registerLabels } from '@/lib/events/register-labels'
import type { ButtonState } from '@/lib/events/types'
import { eventIcs } from '@/lib/events/ics'
import { t } from '@/lib/i18n/t'
import { tp } from '@/lib/i18n/plural'

/* dev-1 D1-11: the signed-in states of the register block (no auth yet, so jsdom covers them) */
vi.mock('@/lib/motion/useReducedMotion', () => ({ prefersReducedMotion: () => true, useReducedMotion: () => true }))

const labels = registerLabels()
const actions = () => ({
  register: vi.fn(async () => 'registered' as const),
  joinWaitlist: vi.fn(async () => ({ result: 'waitlisted' as const, position: 2 })),
  cancel: vi.fn(async () => 'cancelled' as const),
})

function block(state: ButtonState, seatsLeft: number | null = 6, a = actions()) {
  const { container } = render(
    <RegisterBlock eventId={9} state={state} position={state === 'waitlisted' ? 4 : null} signedIn recordingUrl={null} actions={a} labels={labels} capacity={30} seatsLeft={seatsLeft} />,
  )
  return { a, container }
}

describe('RegisterBlock, signed in', () => {
  it('registering lays the own brick and shows مسجّل ✓ with one seat fewer', async () => {
    const { a, container } = block('open')
    expect(container.querySelector('[data-own]')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t('register.open') }))
    await waitFor(() => expect(screen.getByText(t('register.registered'))).toBeInTheDocument())
    expect(a.register).toHaveBeenCalledWith(9)
    expect(container.querySelector('[data-own]')).not.toBeNull()
    expect(screen.getByText(tp('seats.left', 5))).toBeInTheDocument()
  })

  it('cancelling asks in a dialog, then pulls the brick out and reopens', async () => {
    const { a, container } = block('registered', 5)
    expect(container.querySelector('[data-own]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t('register.cancel') }))
    const dialog = container.querySelector('dialog')!
    expect(dialog).toHaveAttribute('open')
    expect(a.cancel).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: t('register.confirm.cancel.yes') }))
    await waitFor(() => expect(screen.getByRole('button', { name: t('register.open') })).toBeInTheDocument())
    expect(a.cancel).toHaveBeenCalledWith(9)
    expect(container.querySelector('[data-own]')).toBeNull()
    expect(screen.getByText(tp('seats.left', 6))).toBeInTheDocument()
  })

  it('Escape closes the dialog without cancelling', async () => {
    const { a, container } = block('registered', 5)
    await userEvent.click(screen.getByRole('button', { name: t('register.cancel') }))
    await userEvent.keyboard('{Escape}')
    expect(container.querySelector('dialog')).not.toHaveAttribute('open')
    expect(a.cancel).not.toHaveBeenCalled()
  })

  it('joining the waitlist shows the position; leaving goes back to full', async () => {
    const { container } = block('full', 0)
    await userEvent.click(screen.getByRole('button', { name: t('waitlist.join') }))
    await waitFor(() => expect(screen.getByRole('button', { name: t('waitlist.leave') })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: t('waitlist.leave') }))
    await userEvent.click(within(container.querySelector('dialog')!).getByRole('button', { name: t('register.confirm.leave.yes') }))
    await waitFor(() => expect(screen.getByRole('button', { name: t('waitlist.join') })).toBeInTheDocument())
  })

  it('wallBricks: the own brick takes the next slot, never past the tenth', () => {
    expect(wallBricks(30, 24, false)).toEqual({ on: 8, own: -1 })
    expect(wallBricks(30, 25, true)).toEqual({ on: 8, own: 8 })
    expect(wallBricks(16, 16, true)).toEqual({ on: 9, own: 9 })
    expect(wallBricks(null, 0, true)).toEqual({ on: 0, own: 0 })
  })

  it('eventIcs: UTC times, escaped text, no meeting link', () => {
    const ics = eventIcs({ id: 9, title: 'لقاء, أول', description: 'سطر\nسطر', startsAt: '2026-11-18T15:00:00Z', endsAt: '2026-11-18T17:00:00Z' }, 'مبنى 58')
    expect(ics).toContain('DTSTART:20261118T150000Z')
    expect(ics).toContain('DTEND:20261118T170000Z')
    expect(ics).toContain('SUMMARY:لقاء\\, أول')
    expect(ics).toContain('DESCRIPTION:سطر\\nسطر')
    expect(ics).not.toMatch(/meet|zoom/i)
  })
})
