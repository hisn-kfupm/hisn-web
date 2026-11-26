import type { CSSProperties } from 'react'
import { seatBricks } from '@/components/ui/SeatMeter'
import type { PluralCategory } from '@/lib/i18n/plural'
import { pickPlural } from '@/lib/i18n/plural'
import { fmtNum } from '@/lib/i18n/number'
import type { Locale } from '@/lib/i18n/locale'

export type WallTone = 'live' | 'settled' | 'void'

type Props = {
  locale: Locale
  capacity: number | null
  /** seats taken, the visitor's own seat included when `mine` */
  taken: number
  /** the visitor holds a seat: their brick is laid in mint */
  mine: boolean
  /** live: open for registration · settled: closed or ended (a finished wall) · void: cancelled */
  tone: WallTone
  labels: { seatsLeft: Record<PluralCategory, string>; seatsOpen: string; yourBrick: string }
}

const BRICKS = 10

/** which bricks are filled by others, and where the visitor's brick goes (pure, for tests) */
export function wallBricks(capacity: number | null, taken: number, mine: boolean): { on: number; own: number } {
  if (capacity === null) return { on: 0, own: mine ? 0 : -1 }
  const on = seatBricks(capacity, taken - (mine ? 1 : 0))
  if (!mine) return { on, own: -1 }
  const shared = Math.min(on, BRICKS - 1)
  return { on: shared, own: shared }
}

/* desktop: two courses in running bond, the bottom course first (courses go bottom to top), each
   course filled from the inline-start; a half brick closes each course. Phones: one course of ten. */
const place = (i: number): CSSProperties =>
  ({ '--r': i < 5 ? 2 : 1, '--c': i < 5 ? 1 + i * 2 : 2 + (i - 5) * 2, '--pc': i + 1, '--i': i }) as CSSProperties

/**
 * The register block's seat meter (redesign §6, D1-11): ten big bricks of wall. Seats taken are
 * laid bricks, seats left are holes, and the visitor's own seat is a mint brick with «لبنتك». The
 * count above sets the number as a big figure inside its plural sentence (left out when full: the
 * button already says «اكتملت المقاعد» and the wall is whole). The bricks are
 * decorative; the sentence carries the meaning. RegisterBlock animates it.
 */
export function SeatWall({ locale, capacity, taken, mine, tone, labels }: Props) {
  const { on, own } = wallBricks(capacity, taken, mine)
  const left = capacity === null ? null : Math.max(0, capacity - taken)
  return (
    <div className="sw" data-tone={tone}>
      {tone === 'live' && left !== 0 && <Count locale={locale} left={left} forms={labels.seatsLeft} open={labels.seatsOpen} />}
      <div aria-hidden="true" className="sw-wall" data-wall>
        <i className="sw-half" style={{ '--r': 1, '--c': 1 } as CSSProperties} />
        {Array.from({ length: BRICKS }, (_, i) => (
          <i key={i} className="sw-brick" data-on={i < on || undefined} data-seat={i} style={place(i)} />
        ))}
        <i className="sw-half" style={{ '--r': 2, '--c': 11 } as CSSProperties} />
        {own >= 0 && (
          <i className="sw-own" data-own style={place(own)}>
            <span className="sw-tag">{labels.yourBrick}</span>
          </i>
        )}
      </div>
    </div>
  )
}

/** «تبقّت ٦ مقاعد» with ٦ set huge; forms without a number («اكتملت المقاعد») are set whole */
function Count({ locale, left, forms, open }: { locale: Locale; left: number | null; forms: Record<PluralCategory, string>; open: string }) {
  if (left === null) return <p className="sw-count sw-count-text">{open}</p>
  const text = pickPlural(locale, forms, left)
  const digits = fmtNum(left, locale)
  const at = text.indexOf(digits)
  if (at < 0) return <p className="sw-count sw-count-text">{text}</p>
  return (
    <p className="sw-count">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="flex flex-wrap items-baseline gap-x-3">
        {text.slice(0, at).trim() && <span className="sw-count-word">{text.slice(0, at).trim()}</span>}
        <span key={left} className="sw-figure">{digits}</span>
        {text.slice(at + digits.length).trim() && <span className="sw-count-word">{text.slice(at + digits.length).trim()}</span>}
      </span>
    </p>
  )
}
