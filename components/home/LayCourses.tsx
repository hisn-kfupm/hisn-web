'use client'
import { useRef, type ReactNode } from 'react'
import { gsap, registerMotion, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'

/**
 * An <ol> whose rows ([data-course] children) are laid in like courses of masonry when they enter
 * the screen (redesign §5.4): each row is revealed by a clip from the inline-start, its [data-day]
 * figure drops in with weight, and its .seat-meter fills (SeatMeter's CSS lay-in, triggered by
 * data-reveal). Rows below the fold wait for their turn. Without JS or under reduced motion, the
 * rows are simply there.
 */
export function LayCourses({ className, children }: { className?: string; children: ReactNode }) {
  const root = useRef<HTMLOListElement>(null)

  useGSAP(
    () => {
      const list = root.current
      if (!list || prefersReducedMotion()) return
      registerMotion()
      const rows = gsap.utils.toArray<HTMLElement>('[data-course]', list)
      const rtl = getComputedStyle(list).direction === 'rtl'
      const hidden = rtl ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)'
      list.setAttribute('data-armed', '')
      gsap.set(rows, { clipPath: hidden })
      gsap.set(list.querySelectorAll('[data-day]'), { yPercent: -60, opacity: 0 })

      const batch = ScrollTrigger.batch(rows, {
        start: 'top 88%',
        once: true,
        onEnter: (entered) => {
          const els = entered as HTMLElement[]
          const tl = gsap.timeline()
          els.forEach((row, i) => {
            const at = i * 0.14
            tl.to(row, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'settle', clearProps: 'clipPath' }, at)
              .to(row.querySelector('[data-day]'), { yPercent: 0, opacity: 1, duration: 0.7, ease: 'brickDrop' }, at + 0.12)
              .add(() => row.querySelector('.seat-meter')?.setAttribute('data-reveal', ''), at + 0.3)
          })
        },
      })
      return () => {
        batch.forEach((st) => st.kill())
        list.removeAttribute('data-armed')
      }
    },
    { scope: root },
  )

  return (
    <ol ref={root} className={className}>
      {children}
    </ol>
  )
}
