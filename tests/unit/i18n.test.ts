import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ar from '@/lib/i18n/ar.json'
import en from '@/lib/i18n/en.json'
import { departments } from '@/lib/data/labels'
import { t, type StringKey } from '@/lib/i18n/t'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

const MARKER = /\s?«مؤقت»/g
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('t()', () => {
  it('every t() key used in the code exists in ar.json', () => {
    const keys = new Set(Object.keys(ar))
    const used = new Set<string>()
    for (const dir of ['app', 'components', 'lib']) {
      for (const file of files(dir)) {
        const src = readFileSync(file, 'utf8')
        // t(locale, 'key') and t('ar', 'key') (admin); \b so calls that merely end in t, such as
        // DateTimeFormat('en-CA'), don't count
        for (const m of src.matchAll(/\bt\(\s*(?:\w+|'(?:ar|en)')\s*,\s*'([^']+)'/g)) used.add(m[1])
        for (const m of src.matchAll(/labelKey:\s*'([^']+)'/g)) used.add(m[1])
      }
    }
    expect(used.size).toBeGreaterThan(100)
    const missing = [...used].filter((k) => !k.includes('${') && !keys.has(k))
    expect(missing).toEqual([])
  })

  it('ar.json and en.json have the same keys', () => {
    const arKeys = Object.keys(ar).sort()
    const enKeys = Object.keys(en).sort()
    // one object, so a failure names every missing key per file
    expect({
      'missing from en.json': arKeys.filter((k) => !enKeys.includes(k)),
      'missing from ar.json': enKeys.filter((k) => !arKeys.includes(k)),
    }).toEqual({ 'missing from en.json': [], 'missing from ar.json': [] })
  })

  it('fills placeholders in both languages', () => {
    expect(t('ar', 'seats.left', { n: 3 })).toContain('3')
    expect(t('en', 'seats.left', { n: 3 })).toContain('3')
  })

  it('throws on a missing placeholder in both languages', () => {
    expect(() => t('ar', 'seats.left')).toThrow('missing var n for key seats.left')
    expect(() => t('en', 'seats.left')).toThrow('missing var n for key seats.left')
  })

  it('reads each language from its own file', () => {
    expect(t('ar', 'nav.events')).toBe('الفعاليات')
    expect(t('en', 'nav.events').replace(MARKER, '')).toBe('Events')
  })

  it('has a title for every department in both files', () => {
    for (const d of departments) {
      const key = `dept.${d.code}.title`
      expect(ar).toHaveProperty([key])
      expect(en).toHaveProperty([key])
    }
  })

  it('uses the same placeholders in both files', () => {
    const arStrings: Record<string, string> = ar
    const enStrings: Record<string, string> = en
    const differ = Object.keys(arStrings).filter(
      (k) => k in enStrings && placeholders(arStrings[k]).join() !== placeholders(enStrings[k]).join(),
    )
    expect(differ).toEqual([])
  })

  it('keeps en.json in English, apart from the «مؤقت» draft marker', () => {
    const enStrings: Record<string, string> = en
    const arabic = Object.keys(enStrings).filter((k) => /[؀-ۿ]/.test(enStrings[k].replace(MARKER, '')))
    expect(arabic).toEqual([])
  })

  it('leaves an empty Arabic value empty in English (an empty role is not rendered)', () => {
    const arStrings: Record<string, string> = ar
    const enStrings: Record<string, string> = en
    for (const k of Object.keys(arStrings).filter((key) => arStrings[key] === '')) expect(enStrings[k]).toBe('')
  })

  it("keeps the hero's accent word inside the slogan in both languages", () => {
    for (const locale of ['ar', 'en'] as const) expect(t(locale, 'brand.slogan')).toContain(t(locale, 'hero.accentWord'))
  })

  it('drops the draft marker in demos, in both languages', () => {
    const before = process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS
    process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS = '1'
    try {
      for (const locale of ['ar', 'en'] as const) expect(t(locale, 'event.about' as StringKey)).not.toContain('«مؤقت»')
    } finally {
      if (before === undefined) delete process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS
      else process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS = before
    }
  })
})
