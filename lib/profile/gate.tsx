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
 * Each opening mounts a new overlay, so every opening starts blank, even one an action asks for as
 * soon as it runs: nothing one person typed is shown to the next person on the same tab (P-1).
 */
export function ProfileGateProvider({ children, locale }: { children: ReactNode; locale: Locale }): JSX.Element {
  const waiting = useRef<(() => Promise<void>) | null>(null)
  /** the overlay on show, by opening (a new number mounts a new, blank overlay), or null */
  const [opening, setOpening] = useState<number | null>(null)
  const openings = useRef(0)
  const pathname = usePathname()
  /** the page the overlay was last opened on */
  const openedOn = useRef(pathname)

  // Made for each page, so the overlay belongs to the page that asked, even one asking as it mounts
  // after a client-side navigation (its effect runs before the provider's effect below).
  const gate = useCallback<Gate>(
    (action) => {
      const samePage = openedOn.current === pathname
      waiting.current = action
      openedOn.current = pathname
      const next = ++openings.current
      // an overlay on show for this page stays, with what was typed (the latest action replaces the
      // earlier one); otherwise a new, blank one opens
      setOpening((current) => (current !== null && samePage ? current : next))
    },
    [pathname],
  )

  const close = useCallback(() => {
    waiting.current = null
    setOpening(null)
  }, [])

  const saved = useCallback(() => {
    const action = waiting.current
    waiting.current = null
    setOpening(null)
    // Run apart from the overlay's save, in a microtask. The action belongs to the caller, which
    // shows its own progress and errors; one that rejects is an unhandled rejection that monitoring
    // sees, and it never takes the page down.
    if (action) void Promise.resolve().then(action)
  }, [])

  // the overlay and its action belong to the page they opened on
  useEffect(() => {
    if (openedOn.current !== pathname) close()
  }, [pathname, close])

  return (
    <GateContext value={gate}>
      {children}
      {opening !== null && <ProfileOverlay key={opening} locale={locale} onClose={close} onSaved={saved} />}
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
