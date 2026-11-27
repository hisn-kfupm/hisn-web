// The wording sheet for marketing: export (ar.json/en.json → CSV) and import (filled CSV → ar.json/en.json).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  HEADERS,
  applySheet,
  buildSheet,
  decodeSheet,
  parseCsv,
  sheetCsv,
  toCsv,
  updateStringsFile,
} from '@/scripts/copy-sheet'
import ar from '@/lib/i18n/ar.json'
import en from '@/lib/i18n/en.json'

const AR: Record<string, string> = ar
const EN: Record<string, string> = en
const MARKER = '«مؤقت»'
const strip = (s: string) => s.replace(/\s?«مؤقت»/g, '')

const STUDENT_ONLY = [
  'meta.description', 'brand.about', 'signin.personalHint', 'signin.institutionalWarning', 'talent.what.body',
  'home.talent.body', 'home.verbs.1.line', 'home.verbs.3.line', 'dept.SECTOR_AWARENESS.summary',
  'dept.SECTOR_AWARENESS.description', 'dept.CAREER_READINESS.description', 'dept.DATA_ANALYSIS.description',
]

describe('CSV', () => {
  it('starts with a UTF-8 BOM, uses CRLF, and quotes commas, quotes and newlines', () => {
    const text = toCsv([['a', 'b,c'], ['قال "نعم"', 'x\ny']])
    expect(text.startsWith('﻿')).toBe(true)
    expect(text).toBe('﻿a,"b,c"\r\n"قال ""نعم""","x\ny"\r\n')
  })

  it('reads back what it writes', () => {
    const rows = [['key', 'v'], ['a', 'b,c'], ['ب', 'قال "نعم"\nسطر']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })

  it('reads a semicolon-separated file (Excel in some regional settings) and a file without BOM', () => {
    expect(parseCsv('key;note\r\na;"b;c"\r\n')).toEqual([['key', 'note'], ['a', 'b;c']])
  })

  it('refuses bytes that are not UTF-8 (Excel saved as plain "CSV", which loses the Arabic)', () => {
    expect(() => decodeSheet(new Uint8Array([0x6b, 0x65, 0x79, 0xe1, 0x0a]))).toThrow(/UTF-8/)
    // TextDecoder drops the BOM itself; parseCsv reads text with or without one
    expect(decodeSheet(new TextEncoder().encode('﻿key,ب'))).toBe('key,ب')
  })
})

describe('the sheet (export)', () => {
  const rows = buildSheet(AR, EN)
  const byKey = new Map(rows.map((r) => [r.key, r]))

  it('has the columns marketing asked for, in order', () => {
    expect(HEADERS).toEqual([
      'key', 'page or place it appears', 'Arabic draft', 'English draft', 'final Arabic', 'final English', 'note',
    ])
    expect(parseCsv(sheetCsv(AR, EN))[0]).toEqual(HEADERS)
  })

  it('has one row per key, except admin, brand.name, meta.title, punctuation-only keys, notFound.code and hero.accentWord', () => {
    const skipped = ['brand.name', 'meta.title', 'event.weekdayDate', 'a11y.when', 'notFound.code', 'hero.accentWord']
    const expected = Object.keys(AR).filter((k) => !k.startsWith('admin.') && !skipped.includes(k))
    expect(rows.map((r) => r.key).sort()).toEqual([...expected].sort())
    expect(byKey.has('brand.university')).toBe(true)
  })

  it('drops the «مؤقت» marker from both drafts and leaves the final columns empty', () => {
    for (const r of rows) {
      expect(r.arDraft).toBe(strip(AR[r.key]))
      expect(r.enDraft).toBe(strip(EN[r.key]))
      // the marker, not the word: credits.intro says «الصور المؤقتة» on purpose
      expect(r.arDraft + r.enDraft).not.toMatch(/«\s*مؤقت\s*»/)
      expect([r.finalAr, r.finalEn]).toEqual(['', ''])
    }
  })

  it('gives every row a place, and sorts rows by place (site order, numbered)', () => {
    for (const r of rows) expect(r.place, r.key).toMatch(/^\d{2} · \S/)
    const places = rows.map((r) => r.place)
    expect(places).toEqual([...places].sort())
    expect(byKey.get('nav.events')?.place).toMatch(/header/i)
    expect(byKey.get('signin.personalHint')?.place).toMatch(/sign-in/i)
    expect(byKey.get('dept.CYBERSECURITY.role2')?.place).toMatch(/department/i)
  })

  it('flags the student-only wording and the empty role4 in the note', () => {
    for (const key of STUDENT_ONLY) expect(byKey.get(key)?.note, key).toMatch(/open to everyone/)
    expect(byKey.get('dept.CAREER_READINESS.role4')?.note).toMatch(/empty/i)
    expect(byKey.get('nav.events')?.note ?? '').not.toMatch(/open to everyone/)
  })

  it('notes placeholders, plural forms, fixed wording and copy that is already approved', () => {
    expect(byKey.get('seats.left.few')?.note).toMatch(/\{n\}/)
    expect(byKey.get('seats.left.few')?.note).toMatch(/3–10/)
    expect(byKey.get('event.badge.almostFull')?.note).toMatch(/fixed/i)
    expect(byKey.get('brand.slogan')?.note).toMatch(/Arabic approved/)
    expect(byKey.get('nav.menuOpen')?.note ?? '').not.toMatch(/approved/)
  })
})

describe('the import', () => {
  // a filled-in sheet: the exported rows, with these finals set
  function filled(finals: Record<string, [string, string]>, edit?: (row: string[]) => void): string {
    const table = parseCsv(sheetCsv(AR, EN))
    for (const row of table.slice(1)) {
      const f = finals[row[0]]
      if (f) [row[4], row[5]] = f
      edit?.(row)
    }
    return toCsv(table)
  }

  it('writes a final value and so removes the marker; a key with no final keeps its draft and marker', () => {
    const csv = filled({ 'nav.menuOpen': ['افتح القائمة', 'Open the menu'], 'nav.menuClose': ['أغلق القائمة', ''] })
    const result = applySheet(csv, AR, EN)
    expect(result.ar['nav.menuOpen']).toBe('افتح القائمة')
    expect(result.en['nav.menuOpen']).toBe('Open the menu')
    expect(result.ar['nav.menuClose']).toBe('أغلق القائمة')
    expect(result.en['nav.menuClose']).toBe(EN['nav.menuClose'])
    expect(result.en['nav.menuClose']).toContain(MARKER)
    expect(result.ar['library.kicker']).toBe(AR['library.kicker'])
    expect(result.applied).toEqual([
      { key: 'nav.menuOpen', lang: 'ar' }, { key: 'nav.menuOpen', lang: 'en' }, { key: 'nav.menuClose', lang: 'ar' },
    ])
    expect(result.skipped).toEqual([])
  })

  it('a final equal to the draft approves it: the marker goes, the text stays', () => {
    const draft = strip(AR['crumbs.home'])
    const result = applySheet(filled({ 'crumbs.home': [draft, ''] }), AR, EN)
    expect(result.ar['crumbs.home']).toBe(draft)
  })

  it('skips a row whose draft no longer matches the string files, and imports the rest', () => {
    const csv = filled({ 'nav.menuOpen': ['افتح القائمة', ''], 'nav.menuClose': ['أغلق', ''] }, (row) => {
      if (row[0] === 'nav.menuClose') row[2] = '????? ???????'
    })
    const result = applySheet(csv, AR, EN)
    expect(result.ar['nav.menuOpen']).toBe('افتح القائمة')
    expect(result.ar['nav.menuClose']).toBe(AR['nav.menuClose'])
    expect(result.skipped).toEqual([{ key: 'nav.menuClose', reason: expect.stringMatching(/draft/) }])
  })

  it('skips finals that drop or add a {placeholder}, still carry «مؤقت», or change fixed wording', () => {
    const csv = filled({
      'seats.left.few': ['تبقّت مقاعد', ''],
      'seats.left.one': ['', '{n} seat left {x}'],
      'library.kicker': ['المكتبة «مؤقت»', ''],
      'event.badge.almostFull': ['المقاعد قاربت على الاكتمال', 'Almost full'],
    })
    const result = applySheet(csv, AR, EN)
    expect(result.skipped.map((s) => s.key).sort()).toEqual(
      ['event.badge.almostFull', 'library.kicker', 'seats.left.few', 'seats.left.one'].sort(),
    )
    expect(result.ar['seats.left.few']).toBe(AR['seats.left.few'])
    expect(result.en['event.badge.almostFull']).toBe(EN['event.badge.almostFull'])
    expect(result.applied).toEqual([])
  })

  it('skips rows for unknown keys and keys that are not in the sheet', () => {
    const csv = filled({}) + toCsv([['no.such.key', '', '', '', 'س', 'x', ''], ['admin.title', '', '', '', 'س', '', '']]).slice(1)
    const result = applySheet(csv, AR, EN)
    expect(result.skipped.map((s) => s.key)).toEqual(['no.such.key', 'admin.title'])
  })

  it('refuses a sheet whose columns are not the exported ones', () => {
    expect(() => applySheet('﻿key,Arabic\r\na,b\r\n', AR, EN)).toThrow(/final Arabic/)
  })

  it('accepts the CRLF Excel writes inside a cell and trims spaces around a final', () => {
    const result = applySheet(filled({ 'nav.menuOpen': ['  افتح القائمة \r\n', ''] }), AR, EN)
    expect(result.ar['nav.menuOpen']).toBe('افتح القائمة')
  })
})

describe('updateStringsFile', () => {
  it('rewrites only the changed lines and keeps the blank lines between groups', () => {
    const file = readFileSync('lib/i18n/ar.json', 'utf8')
    const out = updateStringsFile(file, { 'nav.menuOpen': 'افتح "القائمة"' })
    expect(JSON.parse(out)).toEqual({ ...AR, 'nav.menuOpen': 'افتح "القائمة"' })
    const before = file.split('\n')
    const after = out.split('\n')
    expect(after).toHaveLength(before.length)
    expect(after.filter((line, i) => line !== before[i])).toEqual(['  "nav.menuOpen": "افتح \\"القائمة\\"",'])
  })
})
