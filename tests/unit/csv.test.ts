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

  // Formula injection: Excel runs a cell starting with = + - @ (or tab / CR, which it skips before
  // one of those) as a formula. A leading ' makes it text. Names and major_other are free text.
  describe('neutralises cells that Excel would run as a formula', () => {
    it('= → \'=', () => {
      expect(one('=HYPERLINK("http://x","y")')).toBe('﻿A\r\n"\'=HYPERLINK(""http://x"",""y"")"')
      expect(one('=1+1')).toBe("﻿A\r\n'=1+1")
    })

    it('+ → \'+', () => {
      expect(one('+966500000000')).toBe("﻿A\r\n'+966500000000")
    })

    it('- → \'-', () => {
      expect(one('-2+3')).toBe("﻿A\r\n'-2+3")
    })

    it('@ → \'@', () => {
      expect(one('@SUM(A1)')).toBe("﻿A\r\n'@SUM(A1)")
    })

    it('tab → \'tab', () => {
      expect(one('\t=1+1')).toBe("﻿A\r\n'\t=1+1")
    })

    it('carriage return → \'CR, then quoted for the CR', () => {
      expect(one('\r=1+1')).toBe('﻿A\r\n"\'\r=1+1"')
    })

    it('applies to numbers and headers too', () => {
      expect(one(-1)).toBe("﻿A\r\n'-1")
      expect(toCsv([], [{ key: 'a', header: '=A' }])).toBe("﻿'=A")
    })

    it('leaves those characters alone anywhere but first', () => {
      expect(one('a=b')).toBe('﻿A\r\na=b')
      expect(one('u-01@test.local')).toBe('﻿A\r\nu-01@test.local')
      expect(one(' =1')).toBe('﻿A\r\n =1')
    })

    it('leaves an empty value empty', () => {
      expect(one('')).toBe('﻿A\r\n')
    })
  })

  it('follows the column order, not the row keys', () => {
    expect(toCsv([{ b: 2, a: 1 }], [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }])).toBe('﻿A,B\r\n1,2')
  })
})
