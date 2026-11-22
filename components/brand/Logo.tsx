/**
 * Hisn logo — geometry copied from the brand kit (01-logo/svg). The «حصن» wordmark is outlined
 * (IBM Plex Sans Arabic Bold, shaped with HarfBuzz) so it never falls back to a system font
 * (discovery G-2). Never alter, recolour, rotate or add effects (guide p.9).
 */
const MARK_SHIELD =
  "M40 28 H56 V40 H66 V28 H82 V40 H92 V28 H108 V40 H118 V28 H134 V40 H144 V28 H160 V112 C160 150 132 174 100 186 C68 174 40 150 40 112 Z"
const MARK_TOWER = "M76 172 V106 L100 76 L124 106 V172 C116 176 108 179 100 182 C92 179 84 176 76 172 Z"
const MARK_WINDOW = "M100 116 L111 130 L100 144 L89 130 Z"
const WORDMARK =
  "M54.92 134.87Q40.32 134.87 32.88 128.09Q25.44 121.32 25.44 108.9Q25.44 104.63 26.62 99.27Q27.81 93.92 29.89 88.89L39 91.55Q37.1 95.62 36.01 99.8Q34.92 103.97 34.92 107Q34.92 112.97 39.18 116.24Q43.45 119.51 51.13 119.51H58.71Q66.77 119.51 70.56 115.82Q74.36 112.12 74.36 104.25Q74.36 102.07 73.88 98.66Q73.41 95.25 72.74 92.21L70.85 83.4L81.09 81.4L82.89 90.13Q83.27 91.83 83.55 93.87Q83.84 95.91 84.03 97.9H92.56V109.28L89.71 112.12H83.84Q82.22 123.78 75.16 129.33Q68.1 134.87 54.92 134.87ZM53.97 83.87Q51.51 83.87 49.94 82.35Q48.38 80.84 48.38 77.52Q48.38 74.2 49.94 72.68Q51.51 71.17 53.97 71.17H55.87Q58.33 71.17 59.9 72.68Q61.46 74.2 61.46 77.52Q61.46 80.84 59.9 82.35Q58.33 83.87 55.87 83.87ZM177.31 112.12Q173.99 112.12 171 111.31Q168.02 110.51 165.36 108.33Q159.3 112.12 148.11 112.12H121Q113.41 112.12 109.48 109.04Q105.54 105.96 104.22 99.32H103.65Q102.32 105.96 99.1 109.04Q95.88 112.12 89.71 112.12V100.74L92.56 97.9H95.4Q102.99 97.9 102.99 91.26V85.29H113.41V91.26Q113.41 95.34 115.69 96.86L119.86 89.65Q123.18 83.87 126.64 79.79Q130.1 75.72 133.89 73.16Q137.68 70.6 141.9 69.41Q146.12 68.23 150.95 68.23Q162.14 68.23 167.73 74.34Q173.33 80.46 173.33 91.36Q173.33 94.96 172.66 97.62Q175.03 97.9 177.31 97.9H180.15V109.28ZM148.11 97.9Q152.66 97.9 155.65 97.57Q158.63 97.24 160.48 96.43Q162.33 95.62 163.09 94.2Q163.85 92.78 163.85 90.51Q163.85 86.43 161.19 84.44Q158.54 82.45 152.38 82.45H149.53Q145.27 82.45 142.04 82.78Q138.82 83.11 136.35 84.06Q133.89 85.01 131.9 86.71Q129.91 88.42 128.11 91.17L124.03 97.33L124.32 97.9ZM177.31 100.74 180.15 97.9H186.69Q192 97.9 196.22 97.76Q200.44 97.62 204.23 97.05Q208.02 96.48 211.63 95.34Q215.23 94.2 219.3 92.21L222.81 90.51V90.03L207.64 86.81L193.33 83.3V90.41H182.43V83.11Q182.43 76.38 185.32 73.25Q188.21 70.12 194.18 70.12Q194.94 70.12 195.75 70.22Q196.55 70.31 197.64 70.5Q198.73 70.69 200.25 71.07Q201.77 71.45 204.04 72.02L222.34 76.76Q226.13 77.8 230.49 78.37Q234.85 78.94 239.12 78.94H241.01V93.16H233.62L224.71 99.23Q218.45 103.49 213.47 106.01Q208.5 108.52 204.04 109.89Q199.59 111.27 195.42 111.69Q191.24 112.12 186.69 112.12H177.31Z"

const VIEWBOX = { horizontal: [416.63, 202.24], mark: [164.24, 202.24] } as const
/* guide p.7 minimums: horizontal lockup ≥ 96 px wide; mark ≥ 24 px tall (the drawn mark is 158/202 of the box) */
const MIN_HEIGHT = { horizontal: Math.ceil((96 * 202.24) / 416.63), mark: Math.ceil((24 * 202.24) / 158) } as const

type LogoProps = {
  variant?: "horizontal" | "mark"
  /** primary: gradient mark + deep wordmark (light backgrounds) · reversed: gradient mark + white wordmark (dark) */
  tone?: "primary" | "reversed"
  height?: number
  /** unique per logo on a page, for the gradient id */
  idPrefix?: string
  /** accessible name; omit when the logo sits inside a labelled link */
  title?: string
  className?: string
}

export function Logo({ variant = "horizontal", tone = "primary", height = 48, idPrefix = "hisn", title, className }: LogoProps) {
  const [w, h] = VIEWBOX[variant]
  const px = Math.max(height, MIN_HEIGHT[variant])
  const gid = `${idPrefix}-${variant}-${tone}-g`
  const tx = variant === "horizontal" ? 234.51 : -17.88
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} height={px} width={(px * w) / h} className={className} {...a11y} focusable="false">
      <g transform={`translate(${tx} -5.88)`}>
        <defs>
          <linearGradient id={gid} x1="35" y1="20" x2="170" y2="185" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5FD4AA" />
            <stop offset="0.5" stopColor="#2DB98A" />
            <stop offset="1" stopColor="#17806F" />
          </linearGradient>
        </defs>
        <path d={MARK_SHIELD} fill={`url(#${gid})`} />
        <path d={MARK_TOWER} fill="#022C33" />
        <path d={MARK_WINDOW} fill={`url(#${gid})`} />
      </g>
      {variant === "horizontal" && <path d={WORDMARK} fill={tone === "reversed" ? "#FFFFFF" : "#022C33"} />}
    </svg>
  )
}
