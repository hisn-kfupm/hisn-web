'use client'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'

const STEP_MS = 70
const CELL_MS = 550

/**
 * The brick reveal on photos (revision brief 04 §2): a grid of at most 24 square cells in the
 * band's colour covers the photo and clears in a diagonal stagger from the inline-start corner,
 * once, as the photo enters the viewport. Cells are made in the browser only, so the server HTML
 * (and a visitor without JS) shows the photo as is. Skipped under reduced motion and for photos
 * already on screen at hydration (covering those would flash). Transform and opacity only; the
 * cells are removed when they have cleared.
 */
export function PhotoReveal({ cols, rows }: { cols: number; rows: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const layer = ref.current
    const frame = layer?.parentElement
    if (!layer || !frame || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
    if (frame.getBoundingClientRect().top < window.innerHeight) return

    layer.style.setProperty('--cols', String(cols))
    layer.style.setProperty('--rows', String(rows))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('i')
        cell.style.setProperty('--d', `${(r + c) * STEP_MS}ms`)
        layer.append(cell)
      }
    }

    let timer = 0
    const clear = () => {
      layer.replaceChildren()
      delete layer.dataset.play
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        layer.dataset.play = ''
        timer = window.setTimeout(clear, (cols + rows) * STEP_MS + CELL_MS)
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(frame)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
      clear()
    }
  }, [cols, rows])

  return <span ref={ref} aria-hidden="true" className="photo-cells" />
}
