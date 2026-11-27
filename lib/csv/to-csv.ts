/*
  CSV for the admin exports (A-14), written so Excel opens it with Arabic intact: a UTF-8 byte
  order mark first (without it Excel reads the file as the system code page), lines joined with
  CRLF, and RFC 4180 quoting.
*/

const BOM = '﻿'

/** a value with a comma, double quote, CR or LF is wrapped in double quotes, inner quotes doubled */
function field(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * '﻿' + the header line + one line per row, in the order of `columns`; lines joined with '\r\n'.
 * null → an empty field.
 */
export function toCsv(rows: Record<string, string | number | null>[], columns: { key: string; header: string }[]): string {
  const lines = [columns.map((c) => field(c.header)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => field(row[c.key])).join(','))
  return BOM + lines.join('\r\n')
}
