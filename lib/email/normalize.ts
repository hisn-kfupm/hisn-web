/**
 * The one form an email address is stored, compared and signed in: trimmed and lower-case.
 * email_unsubscribes enforces it with the check email = lower(trim(email)).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
