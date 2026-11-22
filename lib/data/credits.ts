/**
 * The stand-in photos' credits. CC BY and CC BY-SA ask for them to stay with the site, so /credits
 * shows them, read from the table in public/images/stand-in/CREDITS.md: that file stays the one
 * place to edit a credit.
 */
export type Credit = {
  /** the file name in public/images/stand-in/ */
  file: string
  author: string
  /** the file's title on Wikimedia Commons */
  title: string
  sourceUrl: string
  /** e.g. "CC BY 2.0", or "Public domain (US government work)" */
  license: string
  /** the licence deed; null for public domain */
  licenseUrl: string | null
}

/** relative to the app folder, which is the working directory in next build, next start and vitest */
export const CREDITS_FILE = 'public/images/stand-in/CREDITS.md'

/** `[text](url)`; the URL may hold brackets, as many Commons file names do */
const LINK = /^\[(.+)\]\((\S+)\)$/

/** the rows of the markdown table whose first cell is a `file name`; other lines are skipped */
export function parseCredits(markdown: string): Credit[] {
  const credits: Credit[] = []
  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) continue
    const cells = line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
    const file = /^`([^`]+)`$/.exec(cells[0])?.[1]
    const source = cells.length >= 4 ? LINK.exec(cells[2]) : null
    if (!file || !source) continue
    const license = LINK.exec(cells[3])
    credits.push({
      file,
      author: cells[1],
      title: source[1],
      sourceUrl: source[2],
      license: license ? license[1] : cells[3],
      licenseUrl: license ? license[2] : null,
    })
  }
  return credits
}
