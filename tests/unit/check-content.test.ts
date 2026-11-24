// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentFiles, findPlaceholders } from '../../scripts/check-content'

const fixture = (name: string) => `tests/fixtures/content/${name}`

describe('findPlaceholders', () => {
  it('reports the key of each JSON string that still holds «مؤقت»', () => {
    expect(findPlaceholders([fixture('with-marker.json')])).toEqual([
      { file: 'tests/fixtures/content/with-marker.json', where: 'home.title' },
    ])
  })

  it('returns nothing for a clean file', () => {
    expect(findPlaceholders([fixture('clean.json')])).toEqual([])
  })

  it('reports the line number in Markdown', () => {
    expect(findPlaceholders([fixture('with-marker.md')])).toEqual([
      { file: 'tests/fixtures/content/with-marker.md', where: 'line 5' },
    ])
  })

  it('reports the dotted path in nested JSON', () => {
    expect(findPlaceholders([fixture('nested.json')])).toEqual([
      { file: 'tests/fixtures/content/nested.json', where: 'talent.intro' },
      { file: 'tests/fixtures/content/nested.json', where: 'talent.steps.1' },
    ])
  })

  it('checks every file it is given, in order', () => {
    expect(findPlaceholders([fixture('clean.json'), fixture('with-marker.md'), fixture('with-marker.json')])).toEqual([
      { file: 'tests/fixtures/content/with-marker.md', where: 'line 5' },
      { file: 'tests/fixtures/content/with-marker.json', where: 'home.title' },
    ])
  })
})

describe('contentFiles', () => {
  it('checks both string files, Arabic and English, then the Markdown under content/', () => {
    const files = contentFiles()
    expect(files.slice(0, 2)).toEqual(['lib/i18n/ar.json', 'lib/i18n/en.json'])
    expect(files.slice(2).every((f) => f.startsWith('content/') && f.endsWith('.md'))).toBe(true)
  })

  it('reports a marker left only in the English string file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'check-content-'))
    try {
      mkdirSync(path.join(root, 'lib/i18n'), { recursive: true })
      mkdirSync(path.join(root, 'content/privacy'), { recursive: true })
      writeFileSync(path.join(root, 'lib/i18n/ar.json'), JSON.stringify({ footer: { title: 'حصن' } }))
      writeFileSync(path.join(root, 'lib/i18n/en.json'), JSON.stringify({ footer: { title: 'Hisn «مؤقت»' } }))
      writeFileSync(path.join(root, 'content/privacy/v1.en.md'), '# Privacy\n')
      const files = contentFiles(root)
      expect(files).toEqual(['lib/i18n/ar.json', 'lib/i18n/en.json', 'content/privacy/v1.en.md'])
      const hits = findPlaceholders(files.map((f) => path.join(root, f)))
      expect(hits).toEqual([{ file: path.join(root, 'lib/i18n/en.json'), where: 'footer.title' }])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
