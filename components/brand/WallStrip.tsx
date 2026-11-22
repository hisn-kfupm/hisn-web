import { cn } from '@/lib/cn'

type Props = {
  /** unique per strip on a page, for the pattern ids */
  idPrefix?: string
  /** courses of brick under the crenellations */
  courses?: number
  className?: string
}

const H = 30 // course height
const W = 112 // brick length
const M = 2 // mortar
const TONES = ['#02272D', '#033139', '#012C33', '#022026', '#033A42']

/**
 * A static strip of the wall (redesign §6): bricks in running bond under a crenellated top course,
 * for the dark heads of inner pages. Decorative; sits at the bottom of a `relative` dark band.
 * The hero's living wall (components/hero/LivingWall.tsx) uses the same tones.
 */
export function WallStrip({ idPrefix = 'wall', courses = 3, className }: Props) {
  const brick = `${idPrefix}-brick`
  const merlon = `${idPrefix}-merlon`
  const height = (courses + 1) * H
  const bricks = [
    [0, 0], [W, 0],
    [-W / 2, H], [W / 2, H], [(3 * W) / 2, H],
  ]
  return (
    <svg aria-hidden="true" focusable="false" className={cn('pointer-events-none absolute inset-x-0 bottom-0 block w-full', className)} height={height}>
      <defs>
        <pattern id={brick} width={W * 2} height={H * 2} patternUnits="userSpaceOnUse" y={H}>
          {bricks.map(([x, y], i) => (
            <g key={i}>
              <rect x={x + M / 2} y={y + M / 2} width={W - M} height={H - M} fill={TONES[i % TONES.length]} />
              <rect x={x + M / 2} y={y + M / 2} width={W - M} height={1} fill="#ffffff" fillOpacity={0.07} />
              <rect x={x + M / 2} y={y + H - M / 2 - 1} width={W - M} height={1} fill="#000000" fillOpacity={0.3} />
            </g>
          ))}
        </pattern>
        <pattern id={merlon} width={W * 0.9} height={H} patternUnits="userSpaceOnUse" x={W * 0.12}>
          <rect x={M / 2} y={M / 2} width={W * 0.52} height={H - M} fill={TONES[1]} />
          <rect x={M / 2} y={M / 2} width={W * 0.52} height={1} fill="#ffffff" fillOpacity={0.1} />
        </pattern>
      </defs>
      <rect y={H} width="100%" height={courses * H} fill="#01181C" />
      <rect y={H} width="100%" height={courses * H} fill={`url(#${brick})`} />
      <rect y={0} width="100%" height={H} fill={`url(#${merlon})`} />
    </svg>
  )
}
