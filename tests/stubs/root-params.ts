/*
  Vitest's stand-in for next/root-params (vitest.config.ts aliases it here). In Next the compiler
  replaces that module; imported directly it throws. Pages read it only through
  lib/i18n/page-locale.ts; a test picks the locale with setRootLocale and resets it after.
*/
let current = 'ar'

export async function locale(): Promise<string> {
  return current
}

export function setRootLocale(value: string): void {
  current = value
}
