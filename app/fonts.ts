import { IBM_Plex_Sans_Arabic } from 'next/font/google'

/*
  The one font, shared by both root layouts (app/[locale] and app/admin). dev-1 D1-1 loads
  400/500/700 with the arabic and latin subsets; 600 is added for the guide's H3, labels and
  department names (discovery §5 #4, §8). `subsets` only chooses what is preloaded (every range
  is served either way): latin is preloaded so /en text doesn't arrive late, at the cost of four
  more small files (~57 KB) on every page, /ar and /admin included. Plex Arabic's Latin matches
  IBM Plex Sans.
*/
export const plex = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '600', '700'],
  subsets: ['arabic', 'latin'],
  variable: '--font-plex',
  display: 'swap',
})
