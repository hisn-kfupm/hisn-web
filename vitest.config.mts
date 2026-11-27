import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// dev-1 D1-1 asks for vitest.workspace.ts; Vitest 4 removed workspace files, so the same three
// projects live here under `test.projects` (same names, globs and environments).
const alias = {
  '@': fileURLToPath(new URL('./', import.meta.url)),
  // replaced by the Next compiler in the app; tests read the locale from a settable stub
  'next/root-params': fileURLToPath(new URL('./tests/stubs/root-params.ts', import.meta.url)),
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    passWithNoTests: true,
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] } },
      { extends: true, test: { name: 'db', include: ['tests/db/**/*.test.ts'], environment: 'node', setupFiles: ['./tests/db/setup.ts'] } },
      { extends: true, test: { name: 'scripts', include: ['tests/scripts/**/*.test.ts'], environment: 'node' } },
    ],
  },
})
