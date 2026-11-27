// A-8: the database's allowed codes must equal the data files (plan "Global Constraints").
// For each column, the last `<column> in ( … )` list across the migrations (filename order) is what the database allows.
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PROD_MIGRATIONS = join(ROOT, 'supabase', 'migrations')
const TALENT_MIGRATIONS = join(ROOT, 'talent', 'migrations')

type Column = 'major_code' | 'academic_level_code' | 'department_code'

const DATA_FILES: Record<Column, string> = {
  major_code: 'data/majors.json',
  academic_level_code: 'data/academic-levels.json',
  department_code: 'data/departments.json',
}

function dataCodes(column: Column): string[] {
  const rows = JSON.parse(readFileSync(join(ROOT, DATA_FILES[column]), 'utf8')) as { code: string }[]
  return rows.map((row) => row.code)
}

function sqlFiles(dir: string): string[] {
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  return names.filter((name) => name.endsWith('.sql')).sort().map((name) => join(dir, name))
}

// Comments are not constraints: a commented-out list must not count as what the database allows.
const withoutComments = (sql: string) => sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')

// The last allowed-code list for `column` across `dir`'s *.sql files, or null when there is none.
// `\b` keeps `p_major_code in (…)` and `not in (…)` out; `profiles.major_code in (…)` still counts.
function lastCodeList(dir: string, column: Column): string[] | null {
  const list = new RegExp(`\\b${column}\\s+in\\s*\\(([^)]*)\\)`, 'gi')
  let last: string[] | null = null
  for (const file of sqlFiles(dir)) {
    for (const match of withoutComments(readFileSync(file, 'utf8')).matchAll(list)) {
      last = [...match[1].matchAll(/'([^']*)'/g)].map((code) => code[1])
    }
  }
  return last
}

// One message per difference; [] when every column matches. `required`: a column with no list is a difference.
function codeMismatches(dir: string, columns: Column[], options: { required: boolean }): string[] {
  const where = relative(ROOT, dir).split(sep).join('/') || dir
  return columns.flatMap((column) => {
    const allowed = lastCodeList(dir, column)
    if (allowed === null) return options.required ? [`${where}: no ${column} in (…) list found`] : []
    const expected = new Set(dataCodes(column))
    const actual = new Set(allowed)
    const extra = [...actual].filter((code) => !expected.has(code))
    const missing = [...expected].filter((code) => !actual.has(code))
    if (extra.length === 0 && missing.length === 0) return []
    const parts = [
      extra.length ? `allows codes not in ${DATA_FILES[column]}: ${extra.join(', ')}` : '',
      missing.length ? `lacks codes from ${DATA_FILES[column]}: ${missing.join(', ')}` : '',
    ].filter(Boolean)
    return [`${where}: ${column} ${parts.join('; ')}`]
  })
}

describe('allowed codes in the migrations equal data/*.json', () => {
  it('supabase/migrations: major_code, academic_level_code, department_code', () => {
    expect(codeMismatches(PROD_MIGRATIONS, ['major_code', 'academic_level_code', 'department_code'], { required: true })).toEqual([])
  })

  // Until A-10 adds talent/migrations, there is nothing to compare; once a list exists it must match.
  it('talent/migrations: major_code, academic_level_code', () => {
    expect(codeMismatches(TALENT_MIGRATIONS, ['major_code', 'academic_level_code'], { required: false })).toEqual([])
  })
})

describe('the comparison itself', () => {
  let dir: string | undefined

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
    dir = undefined
  })

  // A copy of the real production migrations plus `extra` files written after them.
  function fixture(extra: Record<string, string>): string {
    dir = mkdtempSync(join(tmpdir(), 'codes-match-'))
    for (const name of readdirSync(PROD_MIGRATIONS)) {
      writeFileSync(join(dir, name), readFileSync(join(PROD_MIGRATIONS, name)))
    }
    for (const [name, sql] of Object.entries(extra)) writeFileSync(join(dir, name), sql)
    return dir
  }

  const quoted = (codes: string[]) => codes.map((code) => `'${code}'`).join(', ')

  it('a later migration with one extra code fails, and the message names the extra code', () => {
    const sql = `alter table public.profiles add constraint profiles_major_code_check check (major_code in (${quoted([...dataCodes('major_code'), 'NUCLEAR'])}));\n`
    const messages = codeMismatches(fixture({ '99991231000000_extra_major.sql': sql }), ['major_code'], { required: true })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('NUCLEAR')
    expect(messages[0]).toContain('major_code')
  })

  it('a later migration missing a code fails, and the message names the missing code', () => {
    const sql = `alter table public.events add constraint events_department_code_check check (department_code in (${quoted(dataCodes('department_code').slice(1))}));\n`
    const messages = codeMismatches(fixture({ '99991231000000_drop_dept.sql': sql }), ['department_code'], { required: true })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain(dataCodes('department_code')[0])
  })

  it('uses the last list by filename order, not the first', () => {
    const old = `select 1 where 'x' = any(array['x']) and academic_level_code in ('BACHELOR');\n`
    const current = `alter table t add check (academic_level_code in (${quoted(dataCodes('academic_level_code'))}));\n`
    const target = fixture({ '99991231000001_current.sql': current, '99991231000000_old.sql': old })
    expect(lastCodeList(target, 'academic_level_code')).toEqual(dataCodes('academic_level_code'))
  })

  it('ignores lists in SQL comments and in other columns whose names end the same way', () => {
    const sql = [
      `-- major_code in ('OLD')`,
      `/* major_code in ('OLDER') */`,
      `create function f(p_major_code text) returns bool language sql as $$ select p_major_code in ('X') $$;`,
      '',
    ].join('\n')
    expect(lastCodeList(fixture({ '99991231000000_noise.sql': sql }), 'major_code')).toEqual(dataCodes('major_code'))
  })

  it('a missing folder or list: no difference when optional, a difference naming the column when required', () => {
    const missing = join(tmpdir(), 'codes-match-does-not-exist')
    expect(lastCodeList(missing, 'major_code')).toBeNull()
    expect(codeMismatches(missing, ['major_code'], { required: false })).toEqual([])
    const messages = codeMismatches(missing, ['major_code'], { required: true })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('major_code')
  })
})
