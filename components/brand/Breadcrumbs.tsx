import Link from 'next/link'
import { t } from '@/lib/i18n/t'

export type Crumb = { href?: string; label: string }

/**
 * The trail at the top of an inner page's head (revision 04 §5): earlier steps are links, the
 * current page is plain text with aria-current. The separator is a neutral slash, so it reads the
 * same in Arabic and in the coming English version.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label={t('crumbs.label')} className="mb-6">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-small text-on-dark">
        {items.map((crumb, i) => (
          <li key={`${i}-${crumb.label}`} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-mint">
                /
              </span>
            )}
            {crumb.href ? (
              <Link href={crumb.href} className="text-on-dark no-underline hover:text-white hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
