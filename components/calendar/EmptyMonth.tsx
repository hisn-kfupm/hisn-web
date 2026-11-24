import { Courses } from '@/components/calendar/Courses'
import { t } from '@/lib/i18n/t'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'

// four short courses in running bond; one brick is missing near the top
const COURSES = [6, 7, 6, 7]
const HOLE = { course: 2, brick: 2 }

/**
 * A month without events (dev-1 D1-10): a short wall with one brick missing, the line that there
 * are no events this month, and room for the next-event banner beside it. The courses lay in
 * like the grid's.
 */
export function EmptyMonth({ locale }: { locale: Locale }) {
  return (
    <div data-testid="empty-month" className="flex flex-col gap-8">
      <Courses className="cal-short-wall flex flex-col gap-[3px]">
        {COURSES.map((count, c) => (
          <div key={c} aria-hidden="true" data-course-row className="flex gap-[3px]">
            {Array.from({ length: count }, (_, b) => {
              const hole = c === HOLE.course && b === HOLE.brick
              return <i key={b} data-hole={hole || undefined} className={cn('cal-brick h-11 flex-1 lg:h-14', c % 2 === 1 && (b === 0 || b === count - 1) && 'flex-[0.5]')} />
            })}
          </div>
        ))}
      </Courses>
      <div>
        <p className="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.3] font-bold text-deep">{t(locale, 'calendar.empty')}</p>
        <p className="mt-2 text-body text-muted">{t(locale, 'calendar.empty.body')}</p>
      </div>
    </div>
  )
}
