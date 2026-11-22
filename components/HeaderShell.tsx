'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * The fixed header's behaviour (redesign §4): transparent over dark bands (any element with
 * data-band="dark" under the header's bottom edge, watched by an IntersectionObserver), a solid
 * deep bar over light content; hides
 * on scroll down and returns on scroll up. It never hides while the mobile menu is open
 * (html[data-menu="open"]) or while focus is inside it.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const header = ref.current
    if (!header) return
    let lastY = window.scrollY
    let frame = 0

    // hide on scroll down, return on scroll up: the scroll listener only reads scrollY
    const update = () => {
      frame = 0
      const y = window.scrollY
      const dy = y - lastY
      if (Math.abs(dy) > 3) {
        const hide = dy > 0 && y > header.offsetHeight * 2
        header.toggleAttribute('data-hidden', hide)
        lastY = y
      }
      if (y < 8) header.removeAttribute('data-hidden')
      header.toggleAttribute('data-scrolled', y > 8)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    // transparent over dark bands, solid over light content: an IntersectionObserver watches a
    // 1 px line just under the header, so nothing is measured on scroll
    const hits = new Set<Element>()
    let io: IntersectionObserver | null = null
    const observe = () => {
      io?.disconnect()
      hits.clear()
      const h = header.offsetHeight
      const rootMargin = `-${h}px 0px -${Math.max(0, window.innerHeight - h - 1)}px 0px`
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) hits.add(e.target)
            else hits.delete(e.target)
          }
          header.toggleAttribute('data-solid', hits.size === 0)
        },
        { rootMargin },
      )
      document.querySelectorAll('[data-band="dark"]').forEach((el) => {
        if (!header.contains(el)) io!.observe(el)
      })
    }
    // the line moves only when the viewport's height or the header's changes
    let lastH = window.innerHeight
    const onResize = () => {
      if (window.innerHeight === lastH) return
      lastH = window.innerHeight
      observe()
    }

    update()
    observe()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
      io?.disconnect()
    }
  }, [pathname])

  return (
    <header ref={ref} data-testid="site-header" className="site-header on-dark fixed inset-x-0 top-0 z-40 text-white">
      {children}
    </header>
  )
}
