import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Lucide icon, decorative by default. `mirror` flips directional icons in RTL
 * (chevrons, arrows, back/next, external link). Never mirror play, clock, check or search.
 */
export function Icon({ icon: Glyph, mirror = false, size = 20, className }: { icon: LucideIcon; mirror?: boolean; size?: number; className?: string }) {
  return <Glyph aria-hidden="true" focusable="false" size={size} strokeWidth={1.75} className={cn('shrink-0', mirror && 'rtl:-scale-x-100', className)} />
}
