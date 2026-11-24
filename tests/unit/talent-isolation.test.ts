// HR-1: talent data is write-only, and only app/talent/actions.ts may reach the talent client.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const insert = vi.fn()
const select = vi.fn()
const from = vi.fn(() => ({ insert, select }))
const createClient = vi.fn(() => ({ from }))

vi.mock('@supabase/supabase-js', () => ({ createClient }))

const THIS_FILE = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(THIS_FILE), '../..')
const TALENT_MODULE = join(ROOT, 'lib', 'db', 'talent')
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.vercel', 'coverage'])
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/

function walk(dir: string, match: RegExp): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(path, match)
    return match.test(entry.name) ? [path] : []
  })
}

const rel = (path: string) => relative(ROOT, path).split(sep).join('/')

// Every module specifier in a file: static imports, re-exports, side-effect imports, import(), require().
function specifiers(source: string): string[] {
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1]))
}

function resolvesToTalentModule(file: string, spec: string): boolean {
  let target: string
  if (spec.startsWith('@/')) target = join(ROOT, spec.slice(2))
  else if (spec.startsWith('.')) target = resolve(dirname(file), spec)
  else return false
  target = target.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '').replace(/[\\/]index$/, '')
  return target === TALENT_MODULE
}

describe('talent isolation (HR-1)', () => {
  it('only app/talent/actions.ts imports lib/db/talent', () => {
    const files = ['app', 'components', 'lib'].flatMap((d) => walk(join(ROOT, d), /\.(ts|tsx)$/))
    const importers = files
      .filter((file) => specifiers(readFileSync(file, 'utf8')).some((s) => resolvesToTalentModule(file, s)))
      .map(rel)
    expect(importers.filter((f) => f !== 'app/talent/actions.ts')).toEqual([])
  })

  it('no code file other than lib/db/talent.ts mentions the talent env variables', () => {
    const needle = 'TALENT_SUPABASE_'
    const offenders = walk(ROOT, CODE_FILE)
      .filter((file) => file !== THIS_FILE && rel(file) !== 'lib/db/talent.ts')
      .filter((file) => readFileSync(file, 'utf8').includes(needle))
      .map(rel)
    expect(offenders).toEqual([])
  })

  describe('insertTalentEntry', () => {
    beforeEach(() => {
      insert.mockReset()
      select.mockReset()
      from.mockClear()
    })

    // A thenable that also exposes .select(), so chaining .select() would be recorded.
    function insertResult(result: { error: { message: string } | null }) {
      return { select, then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, fail) }
    }

    it('inserts the row once into talent_entries and never selects', async () => {
      insert.mockReturnValue(insertResult({ error: null }))
      const { insertTalentEntry } = await import('@/lib/db/talent')
      const row = { user_id: 'u', kind: 'withdrawal' as const }

      await insertTalentEntry(row)

      expect(from).toHaveBeenCalledWith('talent_entries')
      expect(insert).toHaveBeenCalledTimes(1)
      expect(insert).toHaveBeenCalledWith(row)
      expect(select).not.toHaveBeenCalled()
    })

    it('rejects with the database error', async () => {
      insert.mockReturnValue(insertResult({ error: { message: 'denied' } }))
      const { insertTalentEntry } = await import('@/lib/db/talent')

      await expect(insertTalentEntry({ user_id: 'u', kind: 'withdrawal' })).rejects.toMatchObject({ message: 'denied' })
      expect(select).not.toHaveBeenCalled()
    })
  })
})
