import type { ReactNode } from 'react'

/**
 * Isolates a mixed-direction value (email, URL, English name) inside Arabic text.
 * Pass `lang="en"` for English so screen readers switch voice (discovery G-16).
 */
export function Bdi(props: { children: ReactNode; lang?: string }) {
  return <bdi lang={props.lang}>{props.children}</bdi>
}
