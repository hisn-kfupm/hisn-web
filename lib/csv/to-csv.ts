/*
  CSV for the admin exports (A-14), written so Excel opens it with Arabic intact: a UTF-8 byte
  order mark first (without it Excel reads the file as the system code page), lines joined with
  CRLF, and RFC 4180 quoting.

  Formula injection (P-1): names and major_other are free text, and Excel runs a cell that starts
  with = + - @ as a formula (tab and CR first are skipped, so they count too). A leading ' makes
  Excel read the cell as text; it shows the value without the '.
*/

const BOM = '﻿'

/** the first characters that make Excel read a cell as a formula */
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * A ' in front of a value starting with = + - @ tab or CR; then a value with a comma, double quote,
 * CR or LF is wrapped in double quotes, inner quotes doubled.
 */
function field(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * '﻿' + the header line + one line per row, in the order of `columns`; lines joined with '\r\n'.
 * null → an empty field. Every cell (headers too) that starts with = + - @ tab or CR gets a ' in
 * front, before quoting.
 */
export function toCsv(rows: Record<string, string | number | null>[], columns: { key: string; header: string }[]): string {
  const lines = [columns.map((c) => field(c.header)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => field(row[c.key])).join(','))
  return BOM + lines.join('\r\n')
}
