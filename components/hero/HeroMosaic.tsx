import type { CSSProperties } from 'react'
import { Photo } from '@/components/ui/Photo'
import { images, type SiteImage } from '@/lib/data/images'
import { label } from '@/lib/data/labels'

/** grid units: 8 columns × 7 courses of square units, so a brick (2 × 1) is 2:1 */
const COURSES = 7

type Brick =
  | { kind: 'tone'; r: number; c: number; w: number; tone: 0 | 1 | 2 | 3 }
  | { kind: 'major'; r: number; c: number; w: number; code: string; tone: 0 | 1 | 2 | 3 }
  | { kind: 'photo'; r: number; c: number; w: number; h: number; image: SiteImage; sizes: string }
  | { kind: 'socket'; r: number; c: number; w: number }

const WIDE = '(min-width: 1024px) 240px, 48vw'
const SMALL = '(min-width: 1024px) 120px, 24vw'
const [satellite, circuit, campus, jetFan, soldering] = images.hero

/*
  Running bond, hand laid: halves at the course ends, photos as double and triple bricks, six
  major names on bricks (desktop only; they are too small to read on phones), and one empty
  socket, where the «لبنة» brick came from before it dropped into the slogan. The majors are codes
  from data/majors.json with names short enough for a two-course brick (so not AIDS).
*/
const BRICKS: Brick[] = [
  { kind: 'tone', r: 1, c: 1, w: 2, tone: 0 },
  { kind: 'major', r: 1, c: 3, w: 2, code: 'CS', tone: 1 },
  { kind: 'photo', r: 1, c: 5, w: 4, h: 2, image: campus, sizes: WIDE },
  { kind: 'tone', r: 2, c: 1, w: 1, tone: 2 },
  { kind: 'major', r: 2, c: 2, w: 2, code: 'SEC', tone: 3 },
  { kind: 'tone', r: 2, c: 4, w: 1, tone: 1 },
  { kind: 'photo', r: 3, c: 1, w: 4, h: 3, image: satellite, sizes: WIDE },
  { kind: 'tone', r: 3, c: 5, w: 2, tone: 0 },
  { kind: 'major', r: 3, c: 7, w: 2, code: 'CE', tone: 2 },
  { kind: 'tone', r: 4, c: 5, w: 1, tone: 3 },
  { kind: 'photo', r: 4, c: 6, w: 2, h: 2, image: jetFan, sizes: SMALL },
  { kind: 'tone', r: 4, c: 8, w: 1, tone: 1 },
  { kind: 'tone', r: 5, c: 5, w: 1, tone: 1 },
  { kind: 'tone', r: 5, c: 8, w: 1, tone: 0 },
  { kind: 'major', r: 6, c: 1, w: 2, code: 'AE', tone: 1 },
  { kind: 'photo', r: 6, c: 3, w: 2, h: 2, image: circuit, sizes: SMALL },
  { kind: 'major', r: 6, c: 5, w: 2, code: 'EE', tone: 3 },
  { kind: 'photo', r: 6, c: 7, w: 2, h: 2, image: soldering, sizes: SMALL },
  { kind: 'major', r: 7, c: 1, w: 2, code: 'MATE', tone: 2 },
  { kind: 'socket', r: 7, c: 5, w: 2 },
]

/** merlons along the tower's top, on every other column */
const MERLONS = [1, 3, 5, 7]

/** which course a brick is laid with, counted from the bottom (the wall rises) */
const course = (b: Brick) => COURSES - (b.r + ('h' in b ? b.h : 1) - 1)

/**
 * The hero wall (revision 04 §4.1) in the DOM: brand-tone bricks, five photo bricks and a few
 * major names, under a crenellated top. It is laid once, course by course from the bottom, with
 * a CSS animation (transform and opacity; composed at once under reduced motion). Decorative:
 * hidden from assistive tech, so the photos carry no alt text here. HeroSearch lights the major
 * bricks (data-major) that match the visitor's query.
 */
export function HeroMosaic() {
  return (
    <div data-mosaic aria-hidden="true" className="mosaic">
      <div className="mosaic-crenels grid grid-cols-8 gap-(--mg)">
        {MERLONS.map((c) => (
          <span key={c} className="mosaic-brick bg-deep-700" style={{ gridColumn: `${c} / span 1`, '--k': COURSES } as CSSProperties} />
        ))}
      </div>
      <div className="mosaic-grid grid aspect-[8/7] grid-cols-8 grid-rows-7 gap-(--mg)">
        {BRICKS.map((b) => {
          const style = {
            gridColumn: `${b.c} / span ${b.w}`,
            gridRow: `${b.r} / span ${'h' in b ? b.h : 1}`,
            '--k': course(b),
          } as CSSProperties
          const key = `${b.r}-${b.c}`
          if (b.kind === 'photo') {
            return (
              <span key={key} className="mosaic-brick mosaic-photo relative" style={style}>
                <Photo image={b.image} alt="" ratio={b.h === 3 ? '4/3' : b.w === b.h ? '1/1' : '16/9'} sizes={b.sizes} tone="dark" reveal={false} className="absolute inset-0" />
              </span>
            )
          }
          if (b.kind === 'socket') return <span key={key} className="mosaic-brick mosaic-socket" style={style} />
          return (
            <span key={key} data-tone={b.tone} data-major={b.kind === 'major' ? b.code : undefined} className="mosaic-brick mosaic-tone" style={style}>
              {b.kind === 'major' && <span className="mosaic-label">{label('majors', b.code)}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
