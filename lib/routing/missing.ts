import { departments } from '@/lib/data/labels'

/*
  Which department and event pages don't exist, decided before rendering. With Cache Components a
  page sends its prerendered shell with a 200 before the request-time check runs, so notFound() in
  the page can show the 404 page but can't change the status; the Proxy uses this to answer with
  the real 404 first (Next docs: streaming guide, "Status codes"). The pages keep their notFound()
  calls as the fallback. The optional /ar or /en prefix covers the paths the pages move to (D1-1).
*/
const DEPARTMENT = /^\/(?:(?:ar|en)\/)?departments\/([^/]+)\/?$/
const EVENT = /^\/(?:(?:ar|en)\/)?events\/([^/]+)\/?$/
const ID = /^\d+$/

/** a path that matches no route, so Next answers it with the 404 page and a 404 status */
export const NOT_FOUND_PATH = '/_not-found-page'

/** true for /departments/<unknown slug> and /events/<id that isn't a public event> */
export async function isMissingPage(pathname: string, eventExists: (id: number) => Promise<boolean>): Promise<boolean> {
  const department = DEPARTMENT.exec(pathname)
  if (department) return !departments.some((d) => d.slug === department[1])
  const event = EVENT.exec(pathname)
  if (event) return !ID.test(event[1]) || !(await eventExists(Number(event[1])))
  return false
}
