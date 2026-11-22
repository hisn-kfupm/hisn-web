'use client'
import { useRef, type ReactNode } from 'react'
import { gsap, registerMotion, ScrollTrigger, useGSAP } from '@/lib/motion/gsap'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'

/**
 * Lays a wall course by course (redesign §6, the calendar): each [data-course-row] child is one
 * course; when it reaches the screen its bricks (direct children) slide down into their slots one
 * after another from the inline-start with the brickDrop ease, then any [data-slot] inside (the
 * event bricks) slots in by a clip from the inline-start. Give it a new `key` to lay it again
 * (the calendar keys it by month). Without JS or under reduced motion the wall is simply built.
 */
export function Courses({ className, children, role }: { className?: string; children: ReactNode; role?: string }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion()) return
      registerMotion()
      const rows = gsap.utils.toArray<HTMLElement>('[data-course-row]', el)
      const rtl = getComputedStyle(el).direction === 'rtl'
      const shut = rtl ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)'
      // rows already scrolled past stay built; only rows on or below the screen are laid
      const pending = rows.filter((row) => row.getBoundingClientRect().bottom > 0)
      for (const row of pending) {
        gsap.set(row, { overflow: 'clip' })
        gsap.set(row.children, { yPercent: -104 })
        gsap.set(row.querySelectorAll('[data-slot]'), { clipPath: shut })
      }

      const batch = ScrollTrigger.batch(pending, {
        start: 'top 94%',
        once: true,
        onEnter: (entered) => {
          const tl = gsap.timeline()
          ;(entered as HTMLElement[]).forEach((row, i) => {
            const at = i * 0.22
            const bricks = Array.from(row.children)
            tl.to(bricks, { yPercent: 0, duration: 0.62, ease: 'brickDrop', stagger: 0.05, clearProps: 'transform' }, at)
            bricks.forEach((brick, j) => {
              const slots = brick.querySelectorAll('[data-slot]')
              if (slots.length) tl.to(slots, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'settle', stagger: 0.08, clearProps: 'clipPath' }, at + j * 0.05 + 0.4)
            })
            tl.set(row, { clearProps: 'overflow' }, at + bricks.length * 0.05 + 0.62)
          })
        },
      })
      return () => batch.forEach((st) => st.kill())
    },
    { scope: root },
  )

  return (
    <div ref={root} role={role} className={className}>
      {children}
    </div>
  )
}
