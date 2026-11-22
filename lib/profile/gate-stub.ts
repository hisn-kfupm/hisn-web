'use client'

/*
  STAND-IN for useProfileGate (D2-7, Abdullah). Swap this import for D2-7's hook once it is on
  main and delete this file. The real hook opens the profile overlay and calls `retry` after the
  profile is saved; this stand-in has no profile to ask for, so it retries straight away.
*/
export function useProfileGate(): (retry: () => void) => void {
  return (retry) => retry()
}
