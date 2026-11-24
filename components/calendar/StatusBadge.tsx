import { Ban, Check, Hourglass, Lock } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Tag } from '@/components/ui/Tag'
import type { CalendarStatus } from '@/lib/events/calendar-status'
import { tp } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'

const LOOK = {
  cancelled: { tone: 'danger', icon: Ban },
  ended: { tone: 'muted', icon: Check },
  full: { tone: 'muted', icon: Lock },
  almostFull: { tone: 'warning', icon: Hourglass },
} as const

const label = (locale: Locale, status: Exclude<CalendarStatus, 'open'>) =>
  status === 'full' ? tp(locale, 'seats.left', 0) : t(locale, `event.badge.${status}`)

/**
 * The calendar's status badge (dev-1 D1-10): «أُلغيت», «انتهت», «المقاعد شارفت على الاكتمال!», or
 * full. 'tag' is the kit's Tag (phone list); 'flag' is a compact line for the grid's small bricks,
 * which turns white and mint when its brick fills. Always an icon plus text, never colour alone.
 */
export function StatusBadge({ locale, status, variant = 'tag' }: { locale: Locale; status: CalendarStatus; variant?: 'tag' | 'flag' }) {
  if (status === 'open') return null
  const look = LOOK[status]
  if (variant === 'tag') return <Tag tone={look.tone} icon={look.icon}>{label(locale, status)}</Tag>
  return (
    <span data-badge={status} className={cn('cal-flag inline-flex items-start gap-1 text-[0.75rem] leading-[1.45] font-semibold')}>
      <Icon icon={look.icon} size={13} className="mt-[0.2em] shrink-0" />
      {label(locale, status)}
    </span>
  )
}
