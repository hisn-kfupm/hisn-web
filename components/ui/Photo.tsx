import Image from 'next/image'
import { PhotoReveal } from '@/components/ui/PhotoReveal'
import { cn } from '@/lib/cn'

export type PhotoRatio = '16/9' | '4/3' | '1/1' | '3/4'

/**
 * reveal grid per ratio: near-square cells, at most 12 (brief: never more than 24). Fewer cells
 * because each one is a composited layer while it fades: with up to 24 per photo, a desktop
 * scroll past a row of photos dropped frames on a weak GPU (home2 perf notes).
 */
const GRID: Record<PhotoRatio, [cols: number, rows: number]> = {
  '16/9': [4, 2],
  '4/3': [4, 3],
  '1/1': [3, 3],
  '3/4': [3, 4],
}

type Props = {
  /** a SiteImage or EventCover from lib/data/images, or any { src } */
  image: { src: string; blurDataURL?: string }
  /** resolved text (t(locale, image.alt) on the server); '' only when the photo is decoration */
  alt: string
  ratio: PhotoRatio
  /** required: how wide the photo is at each breakpoint, e.g. "(min-width: 1024px) 33vw, 100vw" */
  sizes: string
  /** only the page's LCP photo: preloads it, loads eagerly at high priority */
  priority?: boolean
  /** the band it sits on, for the reveal cells: page colour on light bands, deep on dark */
  tone?: 'light' | 'dark'
  /** a mint square in the inline-start corner (the 10 % accent) */
  glint?: boolean
  /** the square-grid reveal on entry (default on) */
  reveal?: boolean
  /**
   * the teal multiply grade (default on; the brief's brand grade, 04 §2). Turn it off for a photo
   * that spans the page or a band from edge to edge, such as the event page's backdrop: the brief
   * bars blend modes on large areas (04 §3), and a backdrop is already toned by the scrim over it.
   * Card-sized photos and half-band photos (TalentBand, PageHead's side photo) keep it.
   */
  grade?: boolean
  /** object-position for the crop, e.g. "50% 30%" */
  focus?: string
  className?: string
}

/**
 * Every photo on the site (revision brief 04 §2): next/image in a fixed-ratio frame with square
 * corners, the brand grade (a teal multiply layer so mixed stock reads as one set), a blur
 * placeholder, a slow 1.04 zoom when the photo or its link is hovered, and the square-grid reveal.
 * Local files go through the image optimiser; a remote event image (admins paste any host) is
 * shown as is. No hooks here, so server and client components can both render it.
 */
export function Photo({ image, alt, ratio, sizes, priority = false, tone = 'light', glint = false, reveal = true, grade = true, focus, className }: Props) {
  const remote = !image.src.startsWith('/')
  const [cols, rows] = GRID[ratio]
  const blur: { placeholder: 'blur' | 'empty' } = { placeholder: image.blurDataURL ? 'blur' : 'empty' }
  return (
    <span className={cn('photo block', className)} data-tone={tone} style={{ aspectRatio: ratio }}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={remote}
        preload={priority}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        {...blur}
        blurDataURL={image.blurDataURL}
        className="photo-img object-cover"
        style={focus ? { objectPosition: focus } : undefined}
      />
      {grade && <span aria-hidden="true" className="photo-grade" />}
      {glint && <span aria-hidden="true" className="photo-glint" />}
      {reveal && <PhotoReveal cols={cols} rows={rows} />}
    </span>
  )
}
