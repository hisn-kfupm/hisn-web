import { existsSync } from 'node:fs'

/*
  Server code under test reads its settings through serverEnv() (lib/env.ts), and Vitest doesn't load
  .env.local. Load it when present: `npm run env:local` writes it, locally and in CI's db job.
  Variables already set in the environment win.
*/
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
