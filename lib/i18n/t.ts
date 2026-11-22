import ar from './ar.json'

export type StringKey = keyof typeof ar

const strings: Record<string, string> = ar

/** the draft marker that ends unapproved copy, with the space before it */
const DRAFT_MARKER = /\s?«مؤقت»/g

/**
 * Look up an Arabic UI string. `{name}` placeholders must all be supplied, or this throws.
 * With NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1 (demos), the « «مؤقت» » markers are left out of the
 * returned text; they stay in ar.json, so `npm run check:content` still lists them.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const raw = strings[key]
  // a key added to ar.json while `next dev` runs is not picked up by the server until a restart
  if (raw === undefined) throw new Error(`unknown string key "${key}" (just added it to ar.json? restart next dev)`)
  const text = raw.replace(/\{(\w+)\}/g, (_match, name: string) => {
    if (!vars || !(name in vars)) throw new Error(`missing var ${name} for key ${key}`)
    return String(vars[name])
  })
  return stripDraft(text)
}

/**
 * Leaves the « «مؤقت» » draft markers out of a text when NEXT_PUBLIC_HIDE_DRAFT_MARKERS=1 (demos);
 * otherwise returns it unchanged. t() uses it, and so do the stand-in event rows, so a demo shows
 * no marker anywhere while the raw text keeps them for `npm run check:content`.
 */
export function stripDraft(text: string): string {
  return process.env.NEXT_PUBLIC_HIDE_DRAFT_MARKERS === '1' ? text.replace(DRAFT_MARKER, '') : text
}
