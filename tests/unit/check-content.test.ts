// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findPlaceholders } from '../../scripts/check-content'

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
