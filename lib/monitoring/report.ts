/**
 * Sends an error to monitoring. A stub until A-15, where Abdulaziz replaces the body with Sentry;
 * the signature stays. 'fatal' is a high-priority alert (spec §11), e.g. a sign-in code that could
 * not be sent.
 */
export function reportError(err: unknown, opts: { level: 'fatal' | 'error'; tags?: Record<string, string> }): void {
  console.error('[reportError]', opts.level, opts.tags, err)
}
