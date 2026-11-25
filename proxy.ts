import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { eventExists } from '@/lib/events/queries'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locale'
import { isMissingPage, NOT_FOUND_PATH } from '@/lib/routing/missing'

/*
  Every request, in this order (dev-2 D2-4):
  1. Locale redirect: '/' and every path without /ar or /en go to their Arabic address, query kept.
     /admin, /api, /_next and public files (the last segment has a '.') keep their address.
  2. Real 404s for department and event pages that don't exist (dev-1 D1-9 and D1-11). A page under
     Cache Components starts its 200 response before notFound() can run, so this answers first: a
     missing page is rewritten to a path with no route, which Next serves as the 404 page with a 404
     status, while the address bar keeps the requested URL.
  3. The @supabase/ssr session refresh, on everything that passes through.
*/

const NO_LOCALE = new Set(['admin', 'api', '_next'])

/** the Arabic address for a path without a locale, or null when the path keeps its address */
function localeRedirect(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  if (isLocale(segments[1]) || NO_LOCALE.has(segments[1]) || segments[segments.length - 1].includes('.')) return null
  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`
  return url
}

/**
 * Renews an expired session and passes the request on. The renewed cookies go both to the browser
 * and to this request, so the page rendering now reads the new token.
 */
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })
  // The proxy needs only the two public values; serverEnv() would fail every request over any missing server variable.
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        // no-store: a CDN must never serve one person's session cookie to someone else
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })
  // Supabase's rule: nothing between creating the client and this call.
  await db.auth.getClaims()
  return response
}

export async function proxy(request: NextRequest) {
  const arabic = localeRedirect(request)
  if (arabic) return NextResponse.redirect(arabic)
  if (await isMissingPage(request.nextUrl.pathname, eventExists)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url))
  }
  return refreshSession(request)
}

export const config = {
  // everything but Next's own assets, the favicon and the cron routes (no session there)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
}
