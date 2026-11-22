import { cn } from '@/lib/cn'

/** ■■■ marks beside section titles (guide pp. 4, 11, 15, 18): three mint squares at falling opacity. Decorative. */
export function SectionMarks({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  const sq = size === 'lg' ? 'size-2.5 lg:size-3' : 'size-2'
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0', size === 'lg' ? 'gap-1.5' : 'gap-1', className)}>
      <i className={cn(sq, 'bg-mint')} />
      <i className={cn(sq, 'bg-mint opacity-60')} />
      <i className={cn(sq, 'bg-mint opacity-30')} />
    </span>
  )
}
