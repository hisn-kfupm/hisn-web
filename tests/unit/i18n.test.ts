import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ar from '@/lib/i18n/ar.json'
import { t } from '@/lib/i18n/t'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('t()', () => {
  it('every t() key used in the code exists in ar.json', () => {
    const keys = new Set(Object.keys(ar))
    const used = new Set<string>()
    for (const dir of ['app', 'components', 'lib']) {
      for (const file of files(dir)) {
        const src = readFileSync(file, 'utf8')
        // \b so calls that merely end in t, such as DateTimeFormat('en-CA'), don't count
        for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
        for (const m of src.matchAll(/labelKey:\s*'([^']+)'/g)) used.add(m[1])
      }
    }
    const missing = [...used].filter((k) => !k.includes('${') && !keys.has(k))
    expect(missing).toEqual([])
  })

  it('fills placeholders', () => {
    expect(t('seats.left', { n: 3 })).toContain('3')
  })

  it('throws on a missing placeholder', () => {
    expect(() => t('seats.left')).toThrow('missing var n for key seats.left')
  })
})
