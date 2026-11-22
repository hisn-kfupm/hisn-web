'use client'
import { useRef, type ReactNode } from 'react'
import { gsap, registerMotion, useGSAP } from '@/lib/motion/gsap'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'

type Props = {
  children: ReactNode
  /** how far the child follows the pointer, as a share of the pointer's offset (default 0.32) */
  strength?: number
  /** the pull reaches this many px beyond the child's box (default 70) */
  reach?: number
  className?: string
}

/**
 * Magnetic wrapper (redesign §5.6): when a fine pointer comes near, the child leans toward it, and
 * settles back when it leaves. Inert on touch screens and under reduced
 * motion. Wrap one interactive element (a LinkButton, a Button).
 */
export function Magnetic({ children, strength = 0.32, reach = 70, className }: Props) {
  const root = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
      registerMotion()
      const target = el.firstElementChild as HTMLElement | null
      if (!target) return
      const x = gsap.quickTo(target, 'x', { duration: 0.45, ease: 'settle' })
      const y = gsap.quickTo(target, 'y', { duration: 0.45, ease: 'settle' })
      let near = false
      let frame = 0
      let last: PointerEvent | null = null

      const update = () => {
        frame = 0
        if (!last) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = last.clientX - cx
        const dy = last.clientY - cy
        const inside = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach
        if (inside) {
          near = true
          x(dx * strength)
          y(dy * strength)
        } else if (near) {
          near = false
          x(0)
          y(0)
        }
      }
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        last = e
        if (!frame) frame = requestAnimationFrame(update)
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      return () => {
        window.removeEventListener('pointermove', onMove)
        cancelAnimationFrame(frame)
      }
    },
    { scope: root },
  )

  return (
    <span ref={root} className={className ?? 'inline-block'}>
      {children}
    </span>
  )
}
