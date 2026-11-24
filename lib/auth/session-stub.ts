/*
  STAND-IN for the session (auth is D2-4, Abdullah). There is no sign-in yet, so every visitor is
  signed out, except when the server env DEMO_SIGNED_IN=1, which returns a demo user so the
  signed-in states can be previewed locally (never in production: see demoSignedIn). Replace
  getSession() with the real session read (supabaseProdServer().auth.getUser()) and delete this file.
*/
export type Session = { userId: string; email: string }

/** the demo user; lib/db/prod-stub.ts makes it the stand-in admin */
export const DEMO_SESSION: Session = { userId: '00000000-0000-0000-0000-00000000d3e0', email: 'demo@example.com' }

/**
 * Whether DEMO_SIGNED_IN=1 is on. It signs every visitor in as the demo user, whom the database
 * stand-in makes an admin, so it is for local previews only (next dev, tests). In production
 * (next build, next start, every Vercel deployment) it throws instead, so a stray setting can't
 * open /admin to everyone (P-1).
 */
export function demoSignedIn(): boolean {
  if (process.env.DEMO_SIGNED_IN !== '1') return false
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DEMO_SIGNED_IN=1 is for local previews only: in production it would make every visitor an admin. Remove it from this environment.')
  }
  return true
}

/** the signed-in user, or null (always null until auth lands, unless DEMO_SIGNED_IN=1 locally) */
export async function getSession(): Promise<Session | null> {
  return demoSignedIn() ? DEMO_SESSION : null
}
