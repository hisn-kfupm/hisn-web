import { describe, expect, it } from 'vitest'
import { normalizeEmail } from '@/lib/email/normalize'

/* Spec rev 2.2: email_unsubscribes.email is stored normalized (check email = lower(trim(email))). */
describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Ali@KFUPM.edu.SA ')).toBe('ali@kfupm.edu.sa')
  })
})
