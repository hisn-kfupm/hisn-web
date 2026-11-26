'use client'
import { createContext, lazy, Suspense, useCallback, useContext, useRef, useState, type JSX, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n/locale'

type Gate = (action: () => Promise<void>) => void

const GateContext = createContext<Gate | null>(null)

// Loaded on the first gate(): every page has the provider, few visits need the form, and the
// layout keeps no import of saveProfile's module.
const ProfileOverlay = lazy(() => import('@/components/ProfileOverlay').then((module) => ({ default: module.ProfileOverlay })))

/**
 * The client side of the profile step (dev-2 D2-7, spec §7.2). The [locale] layout wraps every
 * public page in it. gate(action) opens the profile overlay in the page's language; once
 * saveProfile returns { ok: true }, the overlay closes and the action runs, exactly once. Closing
 * the overlay without saving discards the action. If gate() is called again before a save, the
 * latest action replaces the earlier one.
 */
export function ProfileGateProvider({ children, locale }: { children: ReactNode; locale: Locale }): JSX.Element {
  const waiting = useRef<(() => Promise<void>) | null>(null)
  const [open, setOpen] = useState(false)
  // the overlay mounts on the first gate() and then stays, so what was typed survives a close
  const [used, setUsed] = useState(false)

  const gate = useCallback<Gate>((action) => {
    waiting.current = action
    setUsed(true)
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

  return (
    <GateContext value={gate}>
      {children}
      {used && (
        <Suspense fallback={null}>
          <ProfileOverlay locale={locale} open={open} onClose={close} onSaved={saved} />
        </Suspense>
      )}
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
