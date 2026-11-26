// Seed ids from supabase/seed.sql (A-6). Users u01–u30 and the admin; events 101–110, one per event state.
export const SEED = {
  admin: { id: '00000000-0000-4000-8000-0000000000a1', email: 'admin@test.local' },
  user: (n: number) => ({ id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2,'0')}`, email: `u${String(n).padStart(2,'0')}@test.local` }), // n = 1..30
  events: { open: 101, fullWithWaitlist: 102, unlimited: 103, draft: 104, cancelled: 105,
            pastWithRecording: 106, pastNoRecording: 107, closed: 108, almostFull: 109, onlineOpen: 110 },
} as const
