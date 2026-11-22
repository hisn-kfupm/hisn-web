import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

const tones = {
  danger: 'border-danger/25 bg-danger-bg text-danger',
  warning: 'border-warning/25 bg-warning-bg text-warning',
  muted: 'border-transparent bg-box text-muted',
  ok: 'border-transparent bg-green-100 text-accent-strong',
}

/** Status label: always text plus an icon, never colour alone. */
export function Tag({ tone, icon, children }: { tone: keyof typeof tones; icon: LucideIcon; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2.5 py-1 text-label', tones[tone])}>
      <Icon icon={icon} size={16} />
      {children}
    </span>
  )
}
