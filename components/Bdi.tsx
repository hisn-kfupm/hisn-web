import type { ReactNode } from 'react'
import { dirFor, type Locale } from '@/lib/i18n/locale'

/**
 * Isolates a value in the other script (dev-1 D1-5): emails, URLs and English names inside Arabic
 * text, and Arabic names or fallback Arabic event text inside English text. With `lang` it also
 * sets that language's direction, so screen readers switch voice (discovery G-16) and the value
 * lays out in its own direction: <Bdi lang="en">ali@gmail.com</Bdi>, <Bdi lang="ar">علي</Bdi>.
 */
export function Bdi(props: { children: ReactNode; lang?: Locale }) {
  if (!props.lang) return <bdi>{props.children}</bdi>
  return (
    <bdi lang={props.lang} dir={dirFor(props.lang)}>
      {props.children}
    </bdi>
  )
}
