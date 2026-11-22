import type { ButtonState, CancelResult, JoinWaitlistResult, RegisterResult } from './types'

/*
  What the register button shows after an action returns (dev-1 D1-11). Pure, so the mapping is
  tested apart from the component. The stub actions persist nothing, so the button keeps the new
  state locally until the next page load.
*/

export type Notice = 'error' | 'started' | 'notFound'

export type Outcome =
  | { gate: true }
  | { gate?: false; state: ButtonState; position: number | null; notice: Notice | null }

type Here = { state: ButtonState; position: number | null }

const to = (state: ButtonState, position: number | null = null, notice: Notice | null = null): Outcome => ({ state, position, notice })
const stay = (here: Here, notice: Notice): Outcome => to(here.state, here.position, notice)

export function afterRegister(r: RegisterResult, here: Here): Outcome {
  if (typeof r === 'object' || r === 'profile_required') return { gate: true }
  switch (r) {
    case 'registered':
    case 'already_registered':
      return to('registered')
    case 'already_waitlisted':
      return to('waitlisted', here.position)
    case 'full':
    case 'closed':
    case 'cancelled':
      return to(r)
    case 'not_found':
      return stay(here, 'notFound')
  }
}

export function afterJoin(r: JoinWaitlistResult, here: Here, reopensAs: ButtonState = 'open'): Outcome {
  if ('needsProfile' in r || r.result === 'profile_required') return { gate: true }
  switch (r.result) {
    case 'waitlisted':
    case 'already_waitlisted':
      return to('waitlisted', r.position ?? here.position)
    case 'already_registered':
      return to('registered')
    case 'not_full':
    case 'no_capacity':
      return to(reopensAs)
    case 'closed':
    case 'cancelled':
      return to(r.result)
    case 'not_found':
      return stay(here, 'notFound')
  }
}

/** cancel leaves a registration (back to open) or a waitlist place (back to full) */
export function afterCancel(r: CancelResult, here: Here, reopensAs: ButtonState = 'open'): Outcome {
  if (r === 'started') return stay(here, 'started')
  if (r === 'not_found') return stay(here, 'notFound')
  return to(here.state === 'waitlisted' ? 'full' : reopensAs)
}
