import Link from 'next/link'
import { SectionHead } from '@/components/brand/SectionHead'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { Icon } from '@/components/ui/Icon'
import { Photo } from '@/components/ui/Photo'
import { deptIcon } from '@/lib/data/dept-icons'
import { departmentImage } from '@/lib/data/images'
import { departments } from '@/lib/data/labels'
import { t, type StringKey } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

/**
 * «الأقسام» (revision 04 §4.4) on the deep band: six photo tiles (3 × 2 on desktop, 2 × 3 on
 * tablets, a native snap row on phones), each one link to /departments/<slug> with the icon, the
 * name and its one line. On desktop with a mouse the summary waits under the name and slides up on
 * hover or focus while the photo zooms; elsewhere it is always shown under the photo.
 */
export function DepartmentTiles({ locale, number }: { locale: Locale; number: number }) {
  return (
    <section id="departments" data-testid="departments" data-band="dark" aria-labelledby="departments-title" className="on-dark bg-deep py-14 text-on-dark lg:py-20">
      <div className="wrap">
        <SectionHead locale={locale} number={number} id="departments-title" title={t(locale, 'home.departments.title')} intro={t(locale, 'home.departments.intro')} tone="dark" />
        <ul className="snap-row m-0 list-none p-0 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-6">
          {departments.map((d) => {
            const name = t(locale, `dept.${d.code}.title` as StringKey)
            const summaryId = `dept-summary-${d.code}`
            const image = departmentImage(d.code)
            return (
              <li key={d.code} className="snap-item dept-tile group relative flex flex-col overflow-hidden bg-deep-800">
                <Photo image={image} alt={t(locale, image.alt)} ratio="16/9" tone="dark" sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 80vw" />
                <div className="dept-panel flex-1 border-t-4 border-mint bg-deep-800 px-5 pt-4 pb-5">
                  <h3 className="flex items-center gap-3 text-[1.1875rem] leading-[1.45] font-semibold">
                    <Icon icon={deptIcon(d.code)} size={22} className="shrink-0 text-mint" />
                    <Link href={`/departments/${d.slug}`} aria-describedby={summaryId} className="text-white no-underline after:absolute after:inset-0 after:z-20">
                      <span className="draw-line pb-0.5">{name}</span>
                    </Link>
                    <span aria-hidden="true" className="ms-auto text-mint">
                      <ArrowGlyph size={20} />
                    </span>
                  </h3>
                  <p id={summaryId} className="dept-sum mt-2 text-small text-on-dark">{t(locale, `dept.${d.code}.summary` as StringKey)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
