'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ProfileOverlay } from '@/components/ProfileOverlay'
import type { Locale } from '@/lib/i18n/locale'

type Gate = (action: () => Promise<void>) => void

const GateContext = createContext<Gate | null>(null)

/**
 * The client side of the profile step (dev-2 D2-7, spec §7.2). The [locale] layout wraps every
 * public page in it. gate(action) opens the profile overlay in the page's language; once
 * saveProfile returns { ok: true }, the overlay closes and the action runs, exactly once. Closing
 * the overlay without saving discards the action, and so does leaving the page (Back, a link,
 * signing in or out). If gate() is called again before a save, the latest action replaces the
 * earlier one.
 *
 * The overlay is mounted only while it is open, so every opening starts blank: nothing one person
 * typed is shown to the next person on the same tab (P-1).
 */
export function ProfileGateProvider({ children, locale }: { children: ReactNode; locale: Locale }): JSX.Element {
  const waiting = useRef<(() => Promise<void>) | null>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const openedOn = useRef(pathname)

  const gate = useCallback<Gate>((action) => {
    waiting.current = action
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    waiting.current = null
    setOpen(false)
  }, [])

  const saved = useCallback(() => {
    const action = waiting.current
    waiting.current = null
    setOpen(false)
    // Run apart from the overlay's save, in a microtask. The action belongs to the caller, which
    // shows its own progress and errors; one that rejects is an unhandled rejection that monitoring
    // sees, and it never takes the page down.
    if (action) void Promise.resolve().then(action)
  }, [])

  // the overlay and its action belong to the page they opened on
  useEffect(() => {
    if (openedOn.current === pathname) return
    openedOn.current = pathname
    close()
  }, [pathname, close])

  return (
    <GateContext value={gate}>
      {children}
      {open && <ProfileOverlay locale={locale} onClose={close} onSaved={saved} />}
    </GateContext>
  )
}

/**
 * gate(action): asks for the profile, then runs the action. Use it when a server action answers
 * { needsProfile: true } (withProfile), passing a function that runs the same action again.
 */
export function useProfileGate(): Gate {
  const gate = useContext(GateContext)
  if (!gate) throw new Error('useProfileGate needs a ProfileGateProvider above it (app/[locale]/layout.tsx)')
  return gate
}
