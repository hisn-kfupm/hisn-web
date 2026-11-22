import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { ArrowGlyph } from './ArrowGlyph'

type Props = Omit<ComponentProps<typeof Link>, 'className' | 'children'> & {
  /** 'light' (teal on light bands) or 'dark' (white on dark bands) */
  tone?: 'light' | 'dark'
  className?: string
  children: ReactNode
}

/** A text link whose underline draws from the inline-start and whose arrow nudges forward. */
export function ArrowLink({ tone = 'light', className, children, ...rest }: Props) {
  return (
    <Link
      className={cn(
        'inline-flex min-h-11 items-center gap-2 font-semibold no-underline',
        tone === 'dark' ? 'text-white' : 'text-teal',
        className,
      )}
      {...rest}
    >
      <span className="draw-line pb-0.5">{children}</span>
      <ArrowGlyph />
    </Link>
  )
}
