import { defineConfig } from '@playwright/test'

/*
  A-7 (owner decision): only where the specs live, so `playwright test` doesn't pick up the Vitest files in
  tests/unit. D2-16 adds webServer, baseURL and workers to this file.
*/
export default defineConfig({
  testDir: 'tests/e2e',
})
