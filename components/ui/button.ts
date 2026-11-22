import { cn } from '@/lib/cn'

type Options = {
  variant?: 'primary' | 'secondary' | 'ghost'
  /** 'dark' for buttons on deep/mid/teal bands */
  tone?: 'light' | 'dark'
  size?: 'md' | 'sm' | 'lg'
  block?: boolean
  className?: string
}

/**
 * Button classes for <button> and <Link> (prefer the <Button>/<LinkButton> components).
 * Square corners, 44–56 px targets. On hover a fill wipes in from the inline-start (.btn in
 * app/globals.css); press moves 1 px. Ghost is a text link whose underline draws in.
 */
export function buttonClass({ variant = 'primary', tone = 'light', size = 'md', block = false, className }: Options = {}): string {
  if (variant === 'ghost') {
    return cn(
      'group inline-flex min-h-11 items-center gap-2 px-1 font-semibold no-underline transition-transform duration-75 active:translate-y-px',
      tone === 'dark' ? 'text-white' : 'text-teal',
      className,
    )
  }
  const sizes = { sm: 'min-h-11 px-4 py-2 text-[0.9375rem]', md: 'min-h-12 px-6 py-3 text-body', lg: 'min-h-14 px-7 py-3.5 text-[1.0625rem]' }
  return cn('btn', `btn-${tone}-${variant}`, sizes[size], block && 'w-full whitespace-normal', className)
}
