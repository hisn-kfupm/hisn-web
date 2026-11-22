import { ArrowRight } from 'lucide-react'
import { Icon } from './Icon'

/** The forward arrow: mirrored for RTL, nudges toward the inline-end when its link is hovered. */
export function ArrowGlyph({ size = 18 }: { size?: number }) {
  return (
    <span className="nudge inline-flex" aria-hidden="true">
      <Icon icon={ArrowRight} mirror size={size} />
    </span>
  )
}
