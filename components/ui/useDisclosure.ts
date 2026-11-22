'use client'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * Disclosure pattern (button + panel): Escape closes and returns focus to the button,
 * a click outside closes. Not an ARIA `menu` — the panels hold plain links (discovery §8).
 * Destructure the result and pass `buttonRef` / `panelRef` straight to `ref`.
 */
export function useDisclosure<B extends HTMLElement = HTMLButtonElement, P extends HTMLElement = HTMLElement>() {
  const [open, setOpen] = useState(false)
  const id = useId()
  const buttonRef = useRef<B>(null)
  const panelRef = useRef<P>(null)

  const close = useCallback((focusButton = false) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }, [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true)
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close])

  return { open, close, toggle, id, buttonRef, panelRef }
}
