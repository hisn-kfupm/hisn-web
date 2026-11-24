import type { ReactNode } from 'react'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { cn } from '@/lib/cn'
import { fmtNum } from '@/lib/i18n/number'
import { SectionMarks } from './SectionMarks'
import { SectionNumber } from './SectionNumber'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  number: number
  /** id of the h2, for the section's aria-labelledby */
  id: string
  title: ReactNode
  /** one line under the title */
  intro?: ReactNode
  /** "see all" link at the end of the row */
  link?: { href: string; label: string }
  /** 'dark' on deep/mid bands */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Numbered section heading (revision 04 §1.5: one section-head style). Compact: the green square
 * ٠١ and ■■■ on the same row as the title, an optional intro line under it, and an optional
 * "see all" ArrowLink at the row's inline-end.
 */
export function SectionHead({ locale, number, id, title, intro, link, tone = 'light', className }: Props) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 lg:mb-10', className)}>
      <div className="max-w-[46rem]">
        <div className="flex items-center gap-3 lg:gap-4">
          <SectionNumber size="head">{fmtNum(number, locale, { minimumIntegerDigits: 2 })}</SectionNumber>
          <SectionMarks />
          <h2 id={id} className={cn('text-[clamp(1.625rem,1.15rem+1.9vw,2.625rem)] leading-[1.3] font-bold text-balance', tone === 'dark' ? 'text-white' : 'text-heading')}>
            {title}
          </h2>
        </div>
        {intro && <p className={cn('mt-3 text-body', tone === 'dark' ? 'text-on-dark' : 'text-muted')}>{intro}</p>}
      </div>
      {link && (
        <ArrowLink href={link.href} tone={tone} className="text-[1.0625rem]">
          {link.label}
        </ArrowLink>
      )}
    </div>
  )
}
