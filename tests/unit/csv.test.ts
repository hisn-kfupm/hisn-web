// A-14: the CSV writer behind the admin exports. Excel needs the BOM to read UTF-8 (Arabic), and
// quoting must follow RFC 4180 so commas, quotes and line breaks inside a value stay in their cell.
import { describe, expect, it } from 'vitest'
import { toCsv } from '@/lib/csv/to-csv'

const one = (value: string | number | null) => toCsv([{ a: value }], [{ key: 'a', header: 'A' }])

describe('toCsv', () => {
  it('starts with a UTF-8 byte order mark', () => {
    expect(toCsv([{ a: 'x' }], [{ key: 'a', header: 'A' }]).startsWith('﻿')).toBe(true)
  })

  it('writes the header line, then one line per row, joined with CRLF', () => {
    const csv = toCsv(
      [
        { a: 'x', b: 1 },
        { a: 'y', b: 2 },
      ],
      [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
      ],
    )
    expect(csv).toBe('﻿A,B\r\nx,1\r\ny,2')
  })

  it('keeps Arabic unchanged', () => {
    expect(one('عبدالعزيز')).toBe('﻿A\r\nعبدالعزيز')
  })

  it('quotes a value containing a comma', () => {
    expect(one('a,b')).toBe('﻿A\r\n"a,b"')
  })

  it('quotes a value containing double quotes and doubles them', () => {
    expect(one('say "hi"')).toBe('﻿A\r\n"say ""hi"""')
  })

  it('quotes a value containing a line break', () => {
    expect(one('a\nb')).toBe('﻿A\r\n"a\nb"')
    expect(one('a\rb')).toBe('﻿A\r\n"a\rb"')
  })

  it('writes null as an empty field', () => {
    expect(toCsv([{ a: null, b: 'z' }], [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }])).toBe('﻿A,B\r\n,z')
  })

  it('writes numbers as they are', () => {
    expect(one(13)).toBe('﻿A\r\n13')
  })

  it('quotes headers by the same rule', () => {
    expect(toCsv([], [{ key: 'a', header: 'x,y' }])).toBe('﻿"x,y"')
  })

  it('follows the column order, not the row keys', () => {
    expect(toCsv([{ b: 2, a: 1 }], [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }])).toBe('﻿A,B\r\n1,2')
  })
})
