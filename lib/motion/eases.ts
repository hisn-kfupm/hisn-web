/**
 * The redesign's eases (02-redesign §4). Never the library default.
 * - brick-drop: a fast fall with one short rebound (lands at 58%)
 * - settle: cubic-bezier(.2,.7,.2,1), for things that come to rest
 * - exit: cubic-bezier(.4,0,1,1), for things that leave
 * The CSS twins are --ease-drop, --ease-settle and --ease-exit in app/globals.css.
 * GSAP names (registered once by registerMotion): 'brickDrop', 'settle', 'exit', 'squash'.
 */
export const EASE = {
  brickDrop: 'brickDrop',
  settle: 'settle',
  exit: 'exit',
  /** a soft overshoot for things that rise into place (crenellations, cards) */
  rise: 'rise',
} as const

export const EASE_PATHS: Record<(typeof EASE)[keyof typeof EASE], string> = {
  brickDrop: 'M0,0 C0.22,0 0.42,0.42 0.58,1 0.62,0.97 0.66,0.94 0.71,0.94 0.78,0.94 0.82,1 0.86,1 0.93,0.995 1,1 1,1',
  settle: '0.2,0.7,0.2,1',
  exit: '0.4,0,1,1',
  rise: 'M0,0 C0.18,0.6 0.36,1.08 0.6,1.05 0.78,1.02 0.88,1 1,1',
}

export const CSS_EASE = {
  settle: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const

/** plain-JS versions for canvas work outside GSAP */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const k = clamp01((x - edge0) / (edge1 - edge0))
  return k * k * (3 - 2 * k)
}
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
