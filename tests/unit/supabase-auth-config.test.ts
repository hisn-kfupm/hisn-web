import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
  The sign-in rule (CLAUDE.md): a 6-digit code, valid for 10 minutes, resent
  after 60 s at the earliest. The browser waits 60 s before offering a resend
  (D2-5); Supabase Auth enforces it on the server through
  `[auth.email] max_frequency`. Local Supabase reads these values from
  supabase/config.toml; hisn-dev and hisn-prod are set to match in the dashboard.
*/
function authEmailSection(): Record<string, string> {
  const toml = readFileSync(join(process.cwd(), 'supabase/config.toml'), 'utf8')
  const values: Record<string, string> = {}
  let inSection = false
  for (const raw of toml.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('[')) {
      inSection = line === '[auth.email]'
      continue
    }
    if (!inSection || line === '' || line.startsWith('#')) continue
    const match = /^([a-z_]+)\s*=\s*(.+?)\s*(#.*)?$/.exec(line)
    if (match) values[match[1]] = match[2]
  }
  return values
}

describe('supabase/config.toml, [auth.email]', () => {
  const email = authEmailSection()

  it('sends a 6-digit code', () => {
    expect(email.otp_length).toBe('6')
  })

  it('lets the code expire after 10 minutes', () => {
    expect(email.otp_expiry).toBe('600')
  })

  it('sends a new code to the same address no sooner than 60 s after the last', () => {
    expect(email.max_frequency).toBe('"60s"')
  })
})
