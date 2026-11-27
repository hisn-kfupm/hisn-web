import { NotFoundView } from '@/components/NotFoundView'
import { pageLocale } from '@/lib/i18n/page-locale'

/*
  The 404 inside the site's header and footer, in the page's language (dev-1 D1-5), for notFound()
  in any page and for app/[locale]/[...rest] (unknown addresses). dev-1 reads the locale with
  useParams(); a not-found file gets no params, and this one stays on the server (so the string
  files don't ship to the browser), so it reads the root [locale] segment instead.
*/

export default async function NotFound() {
  return <NotFoundView locale={await pageLocale()} />
}
