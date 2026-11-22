/**
 * Fails while any draft text is left. Every placeholder string carries «مؤقت» (dev-1 D1-4).
 *
 *   npm run check:content
 *
 * Scans lib/i18n/ar.json and content/**\/*.md, prints each hit, and exits 1 if there are any.
 * In CI it runs with `continue-on-error` until the approved copy is in.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const MARKER = /«\s*مؤقت\s*»/

export type Placeholder = { file: string; where: string }

/**
 * Each place in `paths` that still holds «مؤقت».
 * `where` is the dotted key for .json files and "line N" (1-based) for anything else.
 */
export function findPlaceholders(paths: string[]): Placeholder[] {
  return paths.flatMap((file) => {
    const text = readFileSync(file, 'utf8')
    if (file.endsWith('.json')) return keysWithMarker(JSON.parse(text)).map((where) => ({ file, where }))
    return text.split(/\r?\n/).flatMap((line, i) => (MARKER.test(line) ? [{ file, where: `line ${i + 1}` }] : []))
  })
}

function keysWithMarker(value: unknown, at: string[] = []): string[] {
  if (typeof value === 'string') return MARKER.test(value) ? [at.join('.')] : []
  if (Array.isArray(value)) return value.flatMap((item, i) => keysWithMarker(item, [...at, String(i)]))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => keysWithMarker(v, [...at, k]))
  return []
}

/** the files the CLI checks: the string file, then every Markdown file under content/ */
export function contentFiles(root = process.cwd()): string[] {
  const contentDir = path.join(root, 'content')
  const markdown = existsSync(contentDir)
    ? readdirSync(contentDir, { recursive: true, encoding: 'utf8' })
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.posix.join('content', f.split(path.sep).join('/')))
        .sort()
    : []
  return ['lib/i18n/ar.json', ...markdown]
}

function main() {
  const hits = findPlaceholders(contentFiles())
  if (hits.length === 0) {
    console.log('No placeholder text («مؤقت») left.')
    return
  }
  for (const { file, where } of hits) console.log(`${file}: ${where}`)
  console.log(`\n${hits.length} placeholder(s) marked «مؤقت» left. Replace them with approved copy before launch.`)
  process.exitCode = 1
}

// run only as a script (`tsx scripts/check-content.ts`), not when a test imports it
if (process.argv[1] && path.basename(process.argv[1]).startsWith('check-content')) main()
