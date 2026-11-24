'use client'
import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { RegisterButton } from '@/components/RegisterButton'
import { gsap, registerMotion, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'
import type { ButtonState } from '@/lib/events/types'
import { SeatWall, type WallTone } from './SeatWall'

type Props = Omit<ComponentProps<typeof RegisterButton>, 'onChange'> & {
  capacity: number | null
  /** live seats left (getSeatsLeft); null when unknown */
  seatsLeft: number | null
  /** server-rendered extras under the button (add to calendar) */
  children?: ReactNode
}

const toneOf = (state: ButtonState): WallTone => (state === 'cancelled' ? 'void' : state === 'closed' || state === 'ended' ? 'settled' : 'live')

/**
 * The event page's hero object (redesign §6, D1-11): a deep brick holding the big seat wall and
 * the RegisterButton. Registering drops the visitor's own brick into the wall in mint, with a
 * puff of squares as it lands; cancelling pulls it back out. On load the laid bricks drop in
 * course by course. The server HTML is the built wall; motion only runs with JS and without
 * reduced motion. Sticky beside the description on desktop, a bottom bar on phones (CSS).
 */
export function RegisterBlock({ capacity, seatsLeft, children, ...button }: Props) {
  const root = useRef<HTMLElement>(null)
  const [state, setState] = useState(button.state)
  const [mine, setMine] = useState(button.state === 'registered')
  // taken seats, the visitor's own included once registered
  const [taken, setTaken] = useState(capacity !== null && seatsLeft !== null ? Math.max(0, capacity - seatsLeft) : 0)
  const [laid, setLaid] = useState(0)
  const known = capacity !== null && seatsLeft !== null

  // first sight: the laid bricks drop in course by course, the visitor's own brick last
  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion()) return
      registerMotion()
      const bricks = gsap.utils.toArray<HTMLElement>('.sw-brick[data-on], .sw-half, .sw-own', el)
      if (!bricks.length) return
      gsap.set(bricks, { yPercent: -160, opacity: 0 })
      const st = ScrollTrigger.create({
        trigger: el.querySelector('[data-wall]') ?? el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          gsap.to(bricks, { yPercent: 0, opacity: 1, duration: 0.62, ease: 'brickDrop', stagger: 0.06, delay: 0.15, clearProps: 'transform,opacity' })
        },
      })
      return () => st.kill()
    },
    { scope: root },
  )

  // registering: the own brick falls into its slot, squashes a little, and throws up a puff of squares
  useGSAP(
    () => {
      const el = root.current
      const own = el?.querySelector<HTMLElement>('.sw-own')
      if (!laid || !el || !own || prefersReducedMotion()) return
      registerMotion()
      const tl = gsap.timeline()
      tl.fromTo(own, { yPercent: -340, opacity: 0, rotate: -4 }, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.7, ease: 'brickDrop' })
        .to(own, { scaleY: 0.9, scaleX: 1.04, duration: 0.08, ease: 'exit', transformOrigin: '50% 100%' }, 0.4)
        .to(own, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'settle', clearProps: 'transform,opacity' }, 0.48)
        .add(() => puff(own), 0.41)
    },
    { scope: root, dependencies: [laid] },
  )

  const onChange = (next: ButtonState) => {
    setState(next)
    if (next === 'registered' && !mine) {
      if (known) setTaken((n) => n + 1)
      setMine(true)
      setLaid((n) => n + 1)
    } else if (next !== 'registered' && mine) {
      const own = root.current?.querySelector<HTMLElement>('.sw-own')
      const out = () => {
        setMine(false)
        if (known) setTaken((n) => Math.max(0, n - 1))
      }
      if (!own || prefersReducedMotion()) return out()
      // pulled back out: a lift, then up and away
      gsap
        .timeline({ onComplete: out })
        .to(own, { yPercent: -18, duration: 0.18, ease: 'settle' })
        .to(own, { yPercent: -320, opacity: 0, duration: 0.42, ease: 'exit' })
    }
  }

  return (
    <section ref={root} aria-label={button.labels.region} data-state={state} className="reg-block on-dark text-on-dark">
      <SeatWall
        locale={button.locale}
        capacity={known ? capacity : null}
        taken={taken}
        mine={mine}
        tone={toneOf(state)}
        labels={{ seatsLeft: button.labels.seatsLeft, seatsOpen: button.labels.seatsOpen, yourBrick: button.labels.yourBrick }}
      />
      <div className="reg-body">
        <RegisterButton {...button} onChange={onChange} />
      </div>
      {children && <div className="reg-extra">{children}</div>}
    </section>
  )
}

/** eight small mint squares burst from the brick's foot and fade out (decorative; direction-agnostic) */
function puff(brick: HTMLElement) {
  const wall = brick.parentElement
  if (!wall) return
  const wr = wall.getBoundingClientRect()
  const br = brick.getBoundingClientRect()
  for (let i = 0; i < 8; i++) {
    const sq = document.createElement('span')
    sq.className = 'sw-puff'
    wall.appendChild(sq)
    const sr = sq.getBoundingClientRect()
    const side = i % 2 === 0 ? -1 : 1
    const footX = br.left - wr.left + (side < 0 ? 0 : br.width) - (sr.left - wr.left) - sr.width / 2
    const footY = br.bottom - wr.top - (sr.top - wr.top) - sr.height
    gsap.set(sq, { x: footX + gsap.utils.random(-6, 6), y: footY, scale: gsap.utils.random(0.6, 1.1) })
    gsap.to(sq, {
      x: `+=${side * gsap.utils.random(16, 52)}`,
      y: `-=${gsap.utils.random(10, 40)}`,
      rotate: gsap.utils.random(-90, 90),
      opacity: 0,
      duration: gsap.utils.random(0.5, 0.85),
      ease: 'settle',
      onComplete: () => sq.remove(),
    })
  }
}
