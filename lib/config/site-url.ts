/**
 * The site's public origin, from SITE_URL (the same variable the email links use, A-2), or
 * undefined when it is unset or not an absolute URL. The root layout makes it the metadataBase, so
 * canonical and hreflang links are absolute URLs; without it Next would leave them relative rather
 * than point them at localhost.
 */
export function siteUrl(): URL | undefined {
  const raw = process.env.SITE_URL
  if (!raw) return undefined
  try {
    return new URL(raw)
  } catch {
    return undefined
  }
}
