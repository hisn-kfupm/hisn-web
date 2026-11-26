import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterButton } from '@/components/RegisterButton'
import { registerLabels } from '@/lib/events/register-labels'
import type { ButtonState, RegisterResult } from '@/lib/events/types'
import { fmtNum } from '@/lib/i18n/number'
import { t } from '@/lib/i18n/t'

/* dev-1 D1-11: the register button's states, with mocked actions and a mocked useProfileGate */
const gate = vi.fn()
vi.mock('@/lib/profile/gate-stub', () => ({ useProfileGate: () => gate }))

const labels = registerLabels('ar')

function setup(over: Partial<{ eventId: number; state: ButtonState; position: number | null; signedIn: boolean; recordingUrl: string | null; register: () => Promise<RegisterResult> }> = {}) {
  const actions = {
    register: vi.fn(over.register ?? (async () => 'registered' as const)),
    joinWaitlist: vi.fn(async () => ({ result: 'waitlisted' as const, position: 1 })),
    cancel: vi.fn(async () => 'cancelled' as const),
  }
  render(
    <RegisterButton locale="ar"
      eventId={over.eventId ?? 1}
      state={over.state ?? 'open'}
      position={over.position ?? null}
      signedIn={over.signedIn ?? true}
      recordingUrl={over.recordingUrl ?? null}
      actions={actions}
      labels={labels}
    />,
  )
  return actions
}

describe('RegisterButton', () => {
  it('full and signed in: a button to join the waitlist', () => {
    setup({ state: 'full' })
    expect(screen.getByRole('button', { name: t('ar', 'waitlist.join') })).toBeInTheDocument()
  })

  it('waitlisted at 3: the position and a button to leave the list', () => {
    // the spec writes { n: 3 }; the page shows Eastern Arabic digits, so n is fmtNum(3, 'ar') («٣»)
    setup({ state: 'waitlisted', position: 3 })
    expect(screen.getByText(t('ar', 'waitlist.position', { n: fmtNum(3, 'ar') }))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('ar', 'waitlist.leave') })).toBeInTheDocument()
  })

  it('almost full: says the seats are nearly gone', () => {
    setup({ state: 'open_almost_full' })
    expect(screen.getByText('المقاعد شارفت على الاكتمال!')).toBeInTheDocument()
  })

  it('signed out: a link to sign in that returns to the event, and no button', () => {
    setup({ state: 'open', signedIn: false, eventId: 7 })
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sign-in?returnTo=/events/7')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('disables the button while the action is pending', async () => {
    setup({ register: () => new Promise<RegisterResult>(() => {}) })
    const button = screen.getByRole('button', { name: t('ar', 'register.open') })
    await userEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
  })

  it('needs a profile: calls the useProfileGate callback once', async () => {
    setup({ register: async () => ({ needsProfile: true }) })
    await userEvent.click(screen.getByRole('button', { name: t('ar', 'register.open') }))
    await waitFor(() => expect(gate).toHaveBeenCalledTimes(1))
  })

  it('ended with a recording: a link to watch it', () => {
    setup({ state: 'ended', recordingUrl: 'https://youtu.be/abc' })
    expect(screen.getByRole('link', { name: t('ar', 'event.watchRecording') })).toBeInTheDocument()
  })
})
