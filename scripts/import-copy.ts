/**
 * Writes the final values of a filled wording sheet into lib/i18n/ar.json and en.json (see scripts/copy-sheet.ts).
 *
 *   npm run copy:import -- path/to/wording.csv
 *
 * Rows it cannot import safely are skipped and listed; the rest are written. Review the diff, then open a PR.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { applySheet, decodeSheet, updateStringsFile } from './copy-sheet'

const FILES = { ar: 'lib/i18n/ar.json', en: 'lib/i18n/en.json' } as const

function main() {
  const sheet = process.argv[2]
  if (!sheet) {
    console.error('Usage: npm run copy:import -- path/to/wording.csv')
    process.exitCode = 1
    return
  }
  const text = { ar: readFileSync(FILES.ar, 'utf8'), en: readFileSync(FILES.en, 'utf8') }
  const result = applySheet(decodeSheet(readFileSync(sheet)), JSON.parse(text.ar), JSON.parse(text.en))

  for (const lang of ['ar', 'en'] as const) {
    const updates = Object.fromEntries(result.applied.filter((a) => a.lang === lang).map((a) => [a.key, result[lang][a.key]]))
    if (Object.keys(updates).length > 0) writeFileSync(FILES[lang], updateStringsFile(text[lang], updates))
  }

  const count = (lang: string) => result.applied.filter((a) => a.lang === lang).length
  console.log(`Imported ${count('ar')} Arabic and ${count('en')} English values from ${sheet}.`)
  if (result.skipped.length > 0) {
    console.log(`\nSkipped ${result.skipped.length} row(s); nothing from them was written:`)
    for (const { key, reason } of result.skipped) console.log(`  ${key}: ${reason}`)
  }
}

// run only as a script, not when a test imports it
if (process.argv[1] && path.basename(process.argv[1]).startsWith('import-copy')) {
  try {
    main()
  } catch (error) {
    // a sheet that is not UTF-8 or lacks the exported columns: nothing was written
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
