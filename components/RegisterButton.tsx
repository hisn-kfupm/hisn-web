'use client'
import { useState, useTransition, type ReactNode } from 'react'
import { Ban, Check, Hourglass, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button, LinkButton } from '@/components/ui/Buttons'
import { Icon } from '@/components/ui/Icon'
import { Magnetic } from '@/components/ui/Magnetic'
import { afterCancel, afterJoin, afterRegister, type Notice, type Outcome } from '@/lib/events/register-flow'
import type { RegisterLabels } from '@/lib/events/register-labels'
import type { ButtonState, CancelResult, JoinWaitlistResult, RegisterResult } from '@/lib/events/types'
import { fmtNum } from '@/lib/i18n/number'
import { useProfileGate } from '@/lib/profile/gate-stub' // swap for D2-7's useProfileGate once it merges
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'

type Actions = {
  register(eventId: number): Promise<RegisterResult>
  joinWaitlist(eventId: number): Promise<JoinWaitlistResult>
  cancel(eventId: number): Promise<CancelResult>
}

type Props = {
  locale: Locale
  eventId: number
  state: ButtonState
  position: number | null
  signedIn: boolean
  recordingUrl: string | null
  actions: Actions
  /** strings from registerLabels() on the server */
  labels: RegisterLabels
  /** where a cancelled registration goes back to: 'open', or 'open_almost_full' when seats are short */
  reopensAs?: 'open' | 'open_almost_full'
  /** after an action changes the state (the seat meter lays or pulls the visitor's brick) */
  onChange?: (state: ButtonState, position: number | null) => void
}

type Kind = 'register' | 'join' | 'cancel'

/**
 * The register control on the event page (dev-1 D1-11, spec §7.4), in all eight states. Signed
 * out, every actionable state is a link to sign in that comes back here. Cancel and leave ask
 * first in a ConfirmDialog. While an action runs every button is disabled (useTransition); a
 * { needsProfile: true } result goes to useProfileGate with a retry of the same action. The stub
 * actions persist nothing, so the new state is kept here until the next page load.
 */
export function RegisterButton({ locale, eventId, state: initialState, position: initialPosition, signedIn, recordingUrl, actions, labels, reopensAs = 'open', onChange }: Props) {
  const [here, setHere] = useState({ state: initialState, position: initialPosition })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const gate = useProfileGate()
  const { state, position } = here

  const apply = (outcome: Outcome, retry: () => void) => {
    if (outcome.gate) {
      gate(retry)
      return
    }
    setHere({ state: outcome.state, position: outcome.position })
    setNotice(outcome.notice)
    if (outcome.state !== state || outcome.position !== position) onChange?.(outcome.state, outcome.position)
  }

  const run = (kind: Kind) => {
    setNotice(null)
    startTransition(async () => {
      try {
        const now = { state, position }
        const outcome =
          kind === 'register'
            ? afterRegister(await actions.register(eventId), now)
            : kind === 'join'
              ? afterJoin(await actions.joinWaitlist(eventId), now, reopensAs)
              : afterCancel(await actions.cancel(eventId), now, reopensAs)
        startTransition(() => apply(outcome, () => run(kind)))
      } catch {
        setNotice('error')
      }
      setConfirming(false)
    })
  }

  const signIn = `${localePath(locale, '/sign-in')}?returnTo=${localePath(locale, `/events/${eventId}`)}`
  const leaving = state === 'waitlisted'

  /** the main action: a button when signed in, a sign-in link otherwise */
  const act = (label: string, kind: Kind, variant: 'primary' | 'secondary') =>
    signedIn ? (
      <Magnetic className="block">
        <Button variant={variant} tone="dark" size="lg" block disabled={pending} onClick={() => run(kind)} className="reg-act min-h-16 text-[1.1875rem]">
          {label}
        </Button>
      </Magnetic>
    ) : (
      <Magnetic className="block">
        <LinkButton href={signIn} variant={variant} tone="dark" size="lg" block arrow className="reg-act min-h-16 text-[1.1875rem]">
          {label}
        </LinkButton>
      </Magnetic>
    )

  let body: ReactNode
  switch (state) {
    case 'open':
    case 'open_almost_full':
      body = (
        <>
          {state === 'open_almost_full' && (
            <Line icon={Hourglass} className="reg-hot">
              {labels.almostFull}
            </Line>
          )}
          {act(labels.open, 'register', 'primary')}
          <Note>{signedIn ? labels.note.open : labels.note.signIn}</Note>
        </>
      )
      break
    case 'registered':
      body = (
        <>
          <p className="reg-done flex min-h-16 items-center justify-center px-6 text-[1.375rem] font-bold">{labels.registered}</p>
          <Note>{labels.note.registered}</Note>
          <Button variant="ghost" tone="dark" disabled={pending} onClick={() => setConfirming(true)} className="mt-1 self-start">
            {labels.cancel}
          </Button>
        </>
      )
      break
    case 'full':
      body = (
        <>
          <Line icon={Lock}>{labels.full}</Line>
          {act(labels.join, 'join', 'secondary')}
          <Note>{signedIn ? labels.note.full : labels.note.signIn}</Note>
        </>
      )
      break
    case 'waitlisted':
      body = (
        <>
          <Position locale={locale} template={labels.position} fallback={labels.onWaitlist} n={position} />
          <Note>{labels.note.waitlisted}</Note>
          <Button variant="ghost" tone="dark" disabled={pending} onClick={() => setConfirming(true)} className="mt-1 self-start">
            {labels.leave}
          </Button>
        </>
      )
      break
    case 'closed':
      body = (
        <Settled icon={Lock} label={labels.closed}>
          <Note>{labels.note.closed}</Note>
        </Settled>
      )
      break
    case 'cancelled':
      body = (
        <Settled icon={Ban} label={labels.cancelledEvent}>
          <Note>{labels.note.cancelled}</Note>
        </Settled>
      )
      break
    case 'ended':
      body = (
        <Settled icon={Check} label={labels.ended}>
          {recordingUrl ? (
            <LinkButton href={localePath(locale, `/library#recording-${eventId}`)} variant="primary" tone="dark" size="lg" block arrow className="reg-act mt-2 min-h-16 text-[1.1875rem]">
              {labels.watchRecording}
            </LinkButton>
          ) : (
            <Note>{labels.note.ended}</Note>
          )}
        </Settled>
      )
      break
  }

  const confirm = leaving ? labels.confirm.leave : labels.confirm.cancel
  return (
    <div className="reg flex flex-col gap-4" data-state={state} aria-busy={pending || undefined}>
      {body}
      <p role="status" className={notice ? 'reg-notice text-small font-semibold text-white' : 'sr-only'}>
        {notice ? labels.notice[notice] : pending ? labels.pending : ''}
      </p>
      {(state === 'registered' || state === 'waitlisted') && (
        <ConfirmDialog
          open={confirming}
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.yes}
          cancelLabel={labels.confirm.keep}
          busy={pending}
          onConfirm={() => run('cancel')}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="reg-note text-small leading-[1.7] text-on-dark">{children}</p>
}

function Line({ icon, className, children }: { icon: LucideIcon; className?: string; children: ReactNode }) {
  return (
    <p className={`flex items-center gap-2.5 text-[1.0625rem] font-semibold text-white ${className ?? ''}`}>
      <Icon icon={icon} size={20} className="text-mint" />
      {children}
    </p>
  )
}

/** ended, closed and cancelled: a settled plate (a full stop, not an error) */
function Settled({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <>
      <p className="reg-settled flex min-h-16 items-center gap-3 px-5 text-[1.375rem] font-bold text-white">
        <Icon icon={icon} size={24} className="text-on-dark" />
        {label}
      </p>
      {children}
    </>
  )
}

/** the waitlist position as a big figure, over the full sentence «ترتيبك في قائمة الانتظار: ٣» */
function Position({ locale, template, fallback, n }: { locale: Locale; template: string; fallback: string; n: number | null }) {
  if (n === null) return <p className="reg-position text-[1.375rem] font-bold text-white">{fallback}</p>
  return (
    <div className="reg-position flex items-end gap-4">
      <span aria-hidden="true" className="reg-figure grid min-w-[1.1em] place-items-center text-[clamp(4.5rem,3rem+4vw,6.5rem)] leading-[1.1] font-bold text-mint">
        {fmtNum(n, locale)}
      </span>
      <p className="pb-3 text-[1.125rem] leading-[1.5] font-semibold text-white">{template.replace('{n}', fmtNum(n, locale))}</p>
    </div>
  )
}
