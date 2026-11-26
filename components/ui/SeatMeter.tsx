import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { tp } from '@/lib/i18n/plural'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  capacity: number
  /** seats already taken */
  taken: number
  /** 'light' (teal bricks) or 'dark' (mint bricks) */
  tone?: 'light' | 'dark'
  /** lay the bricks in on mount (CSS only; static under reduced motion) */
  reveal?: boolean
  className?: string
}

const BRICKS = 10

/** share of the 10 bricks to fill: at least one once anyone registered, all ten only when full */
export function seatBricks(capacity: number, taken: number): number {
  if (capacity <= 0 || taken <= 0) return 0
  if (taken >= capacity) return BRICKS
  return Math.min(BRICKS - 1, Math.max(1, Math.round((taken / capacity) * BRICKS)))
}

/**
 * Seat meter: ten bricks filled start → end in proportion to seats taken, and the seats left in
 * Arabic plural forms (seats.left.*). The bricks are decorative; the text carries the meaning.
 */
export function SeatMeter({ locale, capacity, taken, tone = 'light', reveal = false, className }: Props) {
  const on = seatBricks(capacity, taken)
  const left = Math.max(0, capacity - taken)
  return (
    <div className={cn('seat-meter flex flex-wrap items-center gap-x-3 gap-y-1.5', className)} data-reveal={reveal || undefined} data-testid="seat-meter">
      <span aria-hidden="true" className={cn('flex gap-[3px]', tone === 'dark' ? 'text-mint' : 'text-teal')}>
        {Array.from({ length: BRICKS }, (_, i) => (
          <i key={i} className="seat-brick h-2.5 w-3.5" data-on={i < on || undefined} style={{ '--i': i } as CSSProperties} />
        ))}
      </span>
      <span className={cn('text-small font-semibold', tone === 'dark' ? 'text-on-dark' : 'text-deep')}>{tp(locale, 'seats.left', left)}</span>
    </div>
  )
}
