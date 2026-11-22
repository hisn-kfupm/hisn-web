import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

// next/font needs Next's compiler; in unit tests it only has to hand back class names.
vi.mock('next/font/google', () => ({
  IBM_Plex_Sans_Arabic: () => ({ className: 'font-plex', variable: 'font-plex-var', style: { fontFamily: 'IBM Plex Sans Arabic' } }),
}))

/*
  jsdom lacks matchMedia, IntersectionObserver, ResizeObserver and canvas contexts. These stand-ins
  report "no reduced motion", "never intersecting" and "no canvas" (getContext → null), so motion
  components must render their composed, readable state without them. (Node-environment test
  files share this setup, hence the window check.)
*/
class NoopObserver {
  root = null
  rootMargin = ''
  thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function installBrowserStandIns() {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
  if (!('IntersectionObserver' in window)) Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: NoopObserver })
  if (!('ResizeObserver' in window)) Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: NoopObserver })
  // jsdom logs "not implemented" for getContext; components must cope with a null context
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null })
  window.scrollTo = (() => {}) as typeof window.scrollTo
}

if (typeof window !== 'undefined') installBrowserStandIns()
