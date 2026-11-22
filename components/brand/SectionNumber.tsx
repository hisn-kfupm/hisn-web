import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Section number in a green square (guide, every section). White on green-500 is 4.26:1, so the
 * numeral stays bold and ≥ 19 px (large text). `head` is the compact section-head size (SectionHead).
 */
export function SectionNumber({ children, size = 'md', className }: { children: ReactNode; size?: 'md' | 'lg' | 'head'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="section-number"
      className={cn(
        'grid shrink-0 place-items-center bg-green leading-none font-bold text-white',
        { lg: 'size-12 text-[1.5rem] lg:size-14 lg:text-[1.75rem]', head: 'size-10 text-[1.25rem] lg:size-12 lg:text-[1.5rem]', md: 'size-9 text-[1.1875rem]' }[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
