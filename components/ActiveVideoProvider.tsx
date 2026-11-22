'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type ActiveVideo = { activeId: string | null; activate: (id: string) => void }

const ActiveVideoContext = createContext<ActiveVideo | null>(null)

/**
 * Holds the one card that is playing (dev-1 D1-12): activating a card replaces the previous id,
 * so the previous card unmounts its player and shows its thumbnail again.
 */
export function ActiveVideoProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const value = useMemo(() => ({ activeId, activate: setActiveId }), [activeId])
  return <ActiveVideoContext.Provider value={value}>{children}</ActiveVideoContext.Provider>
}

export function useActiveVideo(): ActiveVideo {
  const value = useContext(ActiveVideoContext)
  if (!value) throw new Error('VideoCard needs an ActiveVideoProvider above it')
  return value
}
