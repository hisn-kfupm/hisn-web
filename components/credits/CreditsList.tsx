import { Bdi } from '@/components/Bdi'
import { Photo } from '@/components/ui/Photo'
import type { Credit } from '@/lib/data/credits'
import { allImages } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

const byFile = new Map(allImages.map((image) => [image.src.split('/').pop() as string, image]))

/** links that read as links at rest, not only by colour (WCAG 1.4.1) */
const linkClass = 'underline decoration-1 underline-offset-4'

/**
 * /credits: one row per stand-in photo, with a thumbnail (and its alt text) so a reader can tell
 * which photo it is, then the Commons title linking to the source, the author and the licence: its
 * deed linked when it has one, «ملكية عامة» for public domain. Titles, authors and licence names
 * are English proper names, so each sits in a <bdi lang="en">.
 */
export function CreditsList({ locale, credits }: { locale: Locale; credits: Credit[] }) {
  return (
    <ul className="m-0 grid list-none gap-x-12 p-0 md:grid-cols-2">
      {credits.map((credit) => {
        const image = byFile.get(credit.file)
        return (
          <li key={credit.file} data-credit={credit.file} className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 border-b border-line py-5">
            {image ? <Photo image={image} alt={t(locale, image.alt)} ratio="4/3" sizes="96px" reveal={false} /> : <span aria-hidden="true" />}
            <div className="flex min-w-0 flex-col gap-1 text-small">
              <a href={credit.sourceUrl} className={`flex min-h-11 items-center font-semibold break-words text-deep ${linkClass}`}>
                <Bdi lang="en">{credit.title}</Bdi>
              </a>
              <p className="text-muted">
                <span className="text-label text-deep">{t(locale, 'credits.author')}</span>{' '}
                <Bdi lang="en">{credit.author}</Bdi>
              </p>
              <p className="text-muted">
                <span className="text-label text-deep">{t(locale, 'credits.license')}</span>{' '}
                {credit.licenseUrl ? (
                  <a href={credit.licenseUrl} className={`text-teal ${linkClass}`}>
                    <Bdi lang="en">{credit.license}</Bdi>
                  </a>
                ) : (
                  t(locale, 'credits.publicDomain')
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
