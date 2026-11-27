/**
 * Writes the wording sheet for marketing (see scripts/copy-sheet.ts).
 *
 *   npm run copy:export                   → docs/copy/wording.csv
 *   npm run copy:export -- other.csv      → other.csv
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildSheet, sheetCsv } from './copy-sheet'

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>

function main() {
  const out = process.argv[2] ?? 'docs/copy/wording.csv'
  const ar = read('lib/i18n/ar.json')
  const en = read('lib/i18n/en.json')
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(out, sheetCsv(ar, en))
  console.log(`${out}: ${buildSheet(ar, en).length} rows`)
}

// run only as a script, not when a test imports it
if (process.argv[1] && path.basename(process.argv[1]).startsWith('export-copy')) main()
