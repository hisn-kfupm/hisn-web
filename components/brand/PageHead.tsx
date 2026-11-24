import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Photo } from '@/components/ui/Photo'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'
import { SectionMarks } from './SectionMarks'
import { WallStrip } from './WallStrip'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  locale: Locale
  kicker?: ReactNode
  /** large figure above the title (e.g. ٤٠٤) */
  figure?: ReactNode
  title: ReactNode
  /** 'display' for big heads, 'title' for long display titles (an event), 'h1' for inner pages */
  size?: 'display' | 'title' | 'h1'
  /** the trail above the title (revision 04 §5) */
  crumbs?: Crumb[]
  /** a photo on the inline-end side (under the text on phones); makes the head shorter */
  photo?: { image: { src: string; blurDataURL?: string }; alt: string }
  /** a photo behind the whole head under a dark scrim (pages whose inline-end side is taken, like an event's register block) */
  backdrop?: { src: string; blurDataURL?: string }
  children?: ReactNode
  className?: string
}

/**
 * The dark head of every inner page (redesign §6, revision 04 §5): the official gradient under the
 * fixed header, a faint static grain, and a strip of the wall with its crenellations along the
 * bottom. data-band="dark" keeps the header transparent over it. With a photo the head becomes a
 * two-column band and drops some of its height.
 */
export function PageHead({ locale, kicker, figure, title, size = 'h1', crumbs, photo, backdrop, children, className }: Props) {
  const text = (
    <div>
      {kicker && (
        <p className="mb-5 flex items-center gap-3 text-label text-on-dark">
          <SectionMarks />
          {kicker}
        </p>
      )}
      {figure && <p aria-hidden="true" className="mb-1 text-[clamp(4.5rem,3rem+6vw,9rem)] leading-[1.1] font-bold text-mint">{figure}</p>}
      <h1 className={cn('max-w-[16em] text-balance', { display: 'text-mega', title: 'text-[clamp(2.125rem,1.1rem+3.7vw,4.5rem)] leading-[1.24] font-bold', h1: 'text-[clamp(2rem,1.3rem+2.6vw,3.5rem)] leading-[1.25] font-bold' }[size])}>{title}</h1>
      {children}
    </div>
  )
  return (
    <section data-band="dark" className={cn('bg-brand on-dark relative overflow-hidden text-white', className)}>
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-0 isolate">
          {/* no grade layer: the scrim tones it, and the brief bars blend modes on large areas (04 §3) */}
          <Photo image={backdrop} alt="" ratio="16/9" tone="dark" priority reveal={false} grade={false} className="photo-fill" sizes="100vw" />
          <div className="head-scrim absolute inset-0 z-[2]" />
        </div>
      )}
      <div aria-hidden="true" className="grain-layer" />
      <div className={cn('wrap relative', photo ? 'pt-[calc(var(--header-h)+1.75rem)] pb-28 lg:pt-[calc(var(--header-h)+2.5rem)] lg:pb-32' : 'pt-[calc(var(--header-h)+2.5rem)] pb-40 lg:pt-[calc(var(--header-h)+4rem)] lg:pb-44')}>
        {crumbs && <Breadcrumbs locale={locale} items={crumbs} />}
        {photo ? (
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
            {text}
            <div className="relative border-4 border-deep-800">
              <Photo image={photo.image} alt={photo.alt} ratio="4/3" tone="dark" priority reveal={false} sizes="(min-width: 1024px) 520px, 92vw" />
            </div>
          </div>
        ) : (
          text
        )}
      </div>
      <WallStrip idPrefix="head-wall" />
    </section>
  )
}
