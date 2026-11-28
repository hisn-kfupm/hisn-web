/**
 * The wording sheet for marketing: every interface string in one CSV that opens in Excel with its Arabic intact.
 *
 *   npm run copy:export                      writes docs/copy/wording.csv from lib/i18n/ar.json and en.json
 *   npm run copy:import -- <filled.csv>      writes the "final" columns back into ar.json and en.json
 *
 * A final value replaces the string, so its «مؤقت» marker goes; a string with no final value keeps its draft and
 * its marker. The import skips a row (and lists it) when its drafts no longer match the string files (the code
 * changed after the sheet was made, or Excel lost the Arabic), when a final drops or adds a {placeholder}, still
 * carries «مؤقت», or changes wording the founder fixed. Every other row is imported.
 */

export const HEADERS = [
  'key',
  'page or place it appears',
  'Arabic draft',
  'English draft',
  'final Arabic',
  'final English',
  'note',
] as const

const MARKER = /\s?«\s*مؤقت\s*»/g
const strip = (s: string) => s.replace(MARKER, '')
const hasMarker = (s: string) => /«\s*مؤقت\s*»/.test(s)

/** keys that are not wording: names, punctuation, a number, the slogan's accent word; admin is Arabic only */
const LEFT_OUT = new Set(['brand.name', 'meta.title', 'event.weekdayDate', 'a11y.when', 'notFound.code', 'hero.accentWord'])
export const inSheet = (key: string) => !key.startsWith('admin.') && !LEFT_OUT.has(key)

/** Arabic wording the founder fixed (CLAUDE.md: verbatim, never paraphrase); a final may only repeat it */
const FIXED_ARABIC = new Set(['event.badge.almostFull'])

/**
 * Where each key appears, in site order. The first entry whose key or prefix (ending in ".") matches wins; the
 * number keeps the order when the sheet is sorted by this column. A key with no entry fails the tests.
 */
const PLACES: [string, string[]][] = [
  ['Every page · browser tab and search results', ['meta.description']],
  ['Every page · header and menu', ['a11y.skip', 'header.', 'nav.', 'auth.']],
  ['Every page · footer', ['footer.', 'brand.closing', 'brand.university']],
  ['Every page · breadcrumbs', ['crumbs.']],
  ['Home · hero', ['brand.slogan', 'brand.about', 'hero.', 'home.hero.', 'home.next.']],
  ['Home · what we do', ['home.verbs.']],
  ['Home · upcoming events', ['home.events.']],
  ['Home · departments', ['home.departments.']],
  ['Home · talent pool band', ['home.talent.']],
  ['Home · latest recordings', ['home.recordings.']],
  ['Department pages', ['dept.']],
  ['Events calendar', ['calendar.']],
  ['Event cards and event page', ['event.', 'seats.']],
  ['Event page · registration', ['register.', 'waitlist.']],
  ['Library', ['library.']],
  ['Talent pool page', ['talent.']],
  ['Sign-in', ['signin.']],
  ['Privacy page', ['privacy.']],
  ['Photo credits page', ['credits.']],
  ['Page not found', ['notFound.']],
  ['Error page', ['error.']],
  ['Photo descriptions (read aloud by screen readers)', ['img.']],
  ['Emails', ['email.']],
]

function placeOf(key: string): { index: number; label: string } | undefined {
  const index = PLACES.findIndex(([, matches]) => matches.some((m) => (m.endsWith('.') ? key.startsWith(m) : key === m)))
  if (index < 0) return undefined
  return { index, label: `${String(index + 1).padStart(2, '0')} · ${PLACES[index][0]}` }
}

const OPEN_TO_ALL = "Hisn and the talent pool are open to everyone (founder's decision)"
const STUDENTS = `Student-only wording: ${OPEN_TO_ALL}; please rewrite.`
const KFUPM = `Student- and KFUPM-only wording: ${OPEN_TO_ALL}; please rewrite.`

/** notes written by hand: the wording to fix, and keys that need context */
const NOTES: Record<string, string> = {
  'meta.description': `${KFUPM} Shown in search results.`,
  'brand.about': KFUPM,
  'brand.university': `The university's name, also in the mobile menu and the home hero. Keep or change it under the open-to-everyone decision.`,
  'signin.personalHint': `${STUDENTS} ("after graduation")`,
  'signin.institutionalWarning': `${STUDENTS} ("after you graduate"). Shown when the address ends in .edu or .edu.sa.`,
  'talent.what.body': `${STUDENTS} ("a list that students choose to join")`,
  'home.talent.body': `${KFUPM} ("the university's students")`,
  'home.verbs.1.line': STUDENTS,
  'home.verbs.3.line': `${KFUPM} ("the university's students")`,
  'dept.SECTOR_AWARENESS.summary': STUDENTS,
  'dept.SECTOR_AWARENESS.description': STUDENTS,
  'dept.CAREER_READINESS.description': STUDENTS,
  'dept.DATA_ANALYSIS.description': STUDENTS,
  'dept.CAREER_READINESS.role4':
    'Empty: this department has no fourth example role yet. Write one in both languages. If it should show only three roles, say so here and a developer will remove it.',
  'auth.signOut': 'Not shown on the site yet.',
  'footer.alerts': 'Not shown on the site yet.',
  'event.badge.almostFull': 'The Arabic is fixed by the founder and cannot change. English may be reworded.',
}

const PLURAL: Record<string, [string, string]> = {
  zero: ['0', '0'],
  one: ['1', '1'],
  two: ['2', 'not used (copy the "other" form)'],
  few: ['3–10', 'not used (copy the "other" form)'],
  many: ['11–99', 'not used (copy the "other" form)'],
  other: ['100 and more', 'any number but 0 and 1'],
}
const PLURAL_BASES = ['seats.left', 'library.count', 'calendar.count', 'hero.search.count']

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[0]))].sort()

function noteFor(key: string, arValue: string, enValue: string): string {
  const notes: string[] = []
  if (NOTES[key]) notes.push(NOTES[key])
  const form = key.split('.').pop() ?? ''
  if (PLURAL_BASES.some((base) => key === `${base}.${form}`) && PLURAL[form]) {
    notes.push(`Plural form: Arabic for ${PLURAL[form][0]}; English: ${PLURAL[form][1]}.`)
  }
  const vars = placeholders(arValue)
  if (vars.length > 0) notes.push(`Keep ${vars.join(' ')} exactly as written: the site fills it in.`)
  if (dept(key, 'title')) notes.push('Also on event cards, the calendar and the home page.')
  if (!hasMarker(arValue)) notes.push('Arabic approved.')
  if (!hasMarker(enValue)) notes.push('English approved.')
  return notes.join(' ')
}
const dept = (key: string, part: string) => key.startsWith('dept.') && key.endsWith(`.${part}`) && key.split('.').length === 3

export type SheetRow = {
  key: string
  place: string
  arDraft: string
  enDraft: string
  finalAr: string
  finalEn: string
  note: string
}

/** one row per key in the sheet, sorted by place (site order), then by the order of ar.json */
export function buildSheet(ar: Record<string, string>, en: Record<string, string>): SheetRow[] {
  const keys = Object.keys(ar).filter(inSheet)
  const missing = keys.filter((key) => !placeOf(key))
  if (missing.length > 0) throw new Error(`no place for: ${missing.join(', ')} (add it to PLACES in scripts/copy-sheet.ts)`)
  return keys
    .map((key, order) => ({ key, order, place: placeOf(key)! }))
    .sort((a, b) => a.place.index - b.place.index || a.order - b.order)
    .map(({ key, place }) => ({
      key,
      place: place.label,
      arDraft: strip(ar[key]),
      enDraft: strip(en[key]),
      finalAr: '',
      finalEn: '',
      note: noteFor(key, ar[key], en[key]),
    }))
}

export function sheetCsv(ar: Record<string, string>, en: Record<string, string>): string {
  const rows = buildSheet(ar, en).map((r) => [r.key, r.place, r.arDraft, r.enDraft, r.finalAr, r.finalEn, r.note])
  return toCsv([[...HEADERS], ...rows])
}

// CSV ------------------------------------------------------------------------------------------------------------

/** RFC 4180 with a UTF-8 BOM and CRLF, which is what Excel opens with the Arabic intact */
export function toCsv(rows: string[][]): string {
  const cell = (v: string) => (/[",\r\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** Reads what toCsv writes, and what Excel or Google Sheets save: BOM optional, comma or semicolon (Excel in some regions). */
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, '')
  const firstLine = body.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '')
  const sep = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && cell === '') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && body[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v !== ''))
}

/** the file's bytes as text; anything but UTF-8 means Excel saved a plain "CSV" and the Arabic is gone */
export function decodeSheet(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('The sheet is not UTF-8. In Excel use File → Save As → "CSV UTF-8 (Comma delimited)".')
  }
}

// import ---------------------------------------------------------------------------------------------------------

export type ImportResult = {
  ar: Record<string, string>
  en: Record<string, string>
  applied: { key: string; lang: 'ar' | 'en' }[]
  skipped: { key: string; reason: string }[]
}

const tidy = (s: string) => s.replace(/\r\n?/g, '\n').trim()

/** The sheet's final values applied to copies of `ar` and `en`. Throws only when the columns are not the exported ones. */
export function applySheet(csv: string, ar: Record<string, string>, en: Record<string, string>): ImportResult {
  const [header, ...rows] = parseCsv(csv)
  const col = Object.fromEntries(HEADERS.map((h) => [h, (header ?? []).indexOf(h)]))
  const needed = ['key', 'Arabic draft', 'English draft', 'final Arabic', 'final English'] as const
  const missing = needed.filter((h) => col[h] < 0)
  if (missing.length > 0) throw new Error(`The sheet has no column ${missing.map((h) => `"${h}"`).join(', ')}. Use the exported sheet.`)

  const result: ImportResult = { ar: { ...ar }, en: { ...en }, applied: [], skipped: [] }
  for (const row of rows) {
    const get = (h: (typeof needed)[number]) => tidy(row[col[h]] ?? '')
    const key = get('key')
    const finals = { ar: get('final Arabic'), en: get('final English') }
    if (finals.ar === '' && finals.en === '') continue
    const skip = (reason: string) => result.skipped.push({ key, reason })

    if (!(key in ar)) {
      skip('no such key in the string files')
      continue
    }
    if (!inSheet(key)) {
      skip('this key is not part of the wording sheet')
      continue
    }
    if (get('Arabic draft') !== tidy(strip(ar[key])) || get('English draft') !== tidy(strip(en[key]))) {
      skip('its draft no longer matches the string files (changed since the sheet was made, or the file lost its Arabic)')
      continue
    }
    const problem = (['ar', 'en'] as const).flatMap((lang) => {
      const value = finals[lang]
      const current = (lang === 'ar' ? ar : en)[key]
      const name = lang === 'ar' ? 'final Arabic' : 'final English'
      if (value === '') return []
      if (hasMarker(value)) return [`${name} still contains «مؤقت»`]
      if (placeholders(value).join(' ') !== placeholders(current).join(' ')) {
        return [`${name} must keep exactly ${placeholders(current).join(' ') || 'no {placeholders}'}`]
      }
      if (lang === 'ar' && FIXED_ARABIC.has(key) && value !== strip(current)) return ['the Arabic of this key is fixed by the founder']
      return []
    })
    if (problem.length > 0) {
      skip(problem.join('; '))
      continue
    }
    for (const lang of ['ar', 'en'] as const) {
      if (finals[lang] === '') continue
      result[lang][key] = finals[lang]
      result.applied.push({ key, lang })
    }
  }
  return result
}

/**
 * The string file's text with `updates` written in, one line per key, so the blank lines between groups and the
 * order stay as they are. Throws if a key has no line of its own.
 */
export function updateStringsFile(text: string, updates: Record<string, string>): string {
  let out = text
  for (const [key, value] of Object.entries(updates)) {
    const line = new RegExp(`^  ${JSON.stringify(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: .*?(,?)$`, 'm')
    if (!line.test(out)) throw new Error(`no line for ${key}`)
    out = out.replace(line, (_m, comma: string) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`)
  }
  const parsed = JSON.parse(out) as Record<string, string>
  for (const [key, value] of Object.entries(updates)) if (parsed[key] !== value) throw new Error(`failed to write ${key}`)
  return out
}
