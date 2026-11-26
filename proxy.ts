import { NextResponse, type NextRequest } from 'next/server'
import { eventExists } from '@/lib/events/queries'
import { isMissingPage, NOT_FOUND_PATH } from '@/lib/routing/missing'

/*
  Real 404s for department and event pages that don't exist (dev-1 D1-9 and D1-11). A page under
  Cache Components starts its 200 response before notFound() can run, so this answers first: a
  missing page is rewritten to a path with no route, which Next serves as the 404 page with a 404
  status, while the address bar keeps the requested URL. Every other request passes through.
*/
export async function proxy(request: NextRequest) {
  if (await isMissingPage(request.nextUrl.pathname, eventExists)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/departments/:slug', '/events/:id', '/:locale(ar|en)/departments/:slug', '/:locale(ar|en)/events/:id'],
}
