'use client'
import { useEffect, useRef } from 'react'

/**
 * The brand's mint → teal hairline across the top of every page, as the scroll-progress bar
 * (redesign §4). CSS scroll-driven animation where supported; elsewhere a rAF-throttled listener
 * sets --progress. Static and full under reduced motion.
 */
export function ProgressHairline() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = ref.current
    if (!bar || (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()'))) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      bar.style.setProperty('--progress', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1">
      <div ref={ref} data-testid="progress-hairline" className="progress-hairline hairline size-full" />
    </div>
  )
}
