/*
  STAND-IN for the session (auth is D2-4, Abdullah). There is no sign-in yet, so every visitor is
  signed out, except when the server env DEMO_SIGNED_IN=1, which returns a demo user so the
  signed-in states of the event page can be previewed. Replace getSession() with the real
  session read (supabaseProdServer().auth.getUser()) and delete this file.
*/
export type Session = { userId: string; email: string }

const DEMO: Session = { userId: '00000000-0000-0000-0000-00000000d3e0', email: 'demo@example.com' }

/** the signed-in user, or null (always null until auth lands, unless DEMO_SIGNED_IN=1) */
export async function getSession(): Promise<Session | null> {
  return process.env.DEMO_SIGNED_IN === '1' ? DEMO : null
}
