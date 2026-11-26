import { NotFoundView } from '@/components/NotFoundView'
import { pageLocale } from '@/lib/i18n/page-locale'

/**
 * The 404 inside the site's header and footer, in the page's language (dev-1 D1-5). A not-found
 * file gets no params, so the locale comes from the root [locale] segment.
 */
export default async function NotFound() {
  return <NotFoundView locale={await pageLocale()} />
}
