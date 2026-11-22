/*
  YouTube links (dev-1 D1-12). D1-14 reuses youtubeId to validate the recording links admins paste.
*/

const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'])
const ID = /^[A-Za-z0-9_-]+$/

/**
 * The video id in a YouTube link, or null. Accepts youtube.com/watch?v=ID, youtu.be/ID,
 * youtube.com/shorts/ID and youtube.com/embed/ID, over http or https, with or without www.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (!HOSTS.has(host)) return null

  let id: string | null = null
  if (host.endsWith('youtu.be')) id = parsed.pathname.split('/')[1] || null
  else if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
  else id = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null

  return id && ID.test(id) ? id : null
}

/** the thumbnail YouTube serves for a video */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** the privacy-enhanced player, starting at once (it only loads after a click) */
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
