import { SectionHead } from '@/components/brand/SectionHead'
import { Photo } from '@/components/ui/Photo'
import { images } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

const VERBS = [
  { n: 1, image: images.verbs.learn },
  { n: 2, image: images.verbs.qualify },
  { n: 3, image: images.verbs.connect },
] as const

/**
 * «ماذا نفعل» (revision 04 §4.2): the three verbs of the approved description, each a column with
 * a photo, the verb in big type and one line. On phones each verb is a row: a square photo beside
 * the text. No pin, no scrub: the photos' square reveal is the section's only motion.
 */
export function WhatWeDo({ locale, number }: { locale: Locale; number: number }) {
  return (
    <section data-testid="verbs" aria-labelledby="verbs-title" className="bg-page py-14 lg:py-20">
      <div className="wrap">
        <SectionHead locale={locale} number={number} id="verbs-title" title={t(locale, 'home.verbs.title')} />
        <ol className="m-0 grid list-none gap-6 p-0 lg:grid-cols-3 lg:gap-8">
          {VERBS.map(({ n, image }) => (
            <li key={n} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-5 border-t-4 border-deep pt-5 sm:grid-cols-[9rem_minmax(0,1fr)] lg:block lg:pt-0 lg:border-t-0">
              <div className="relative aspect-square lg:aspect-video">
                <Photo image={image} alt={t(locale, image.alt)} ratio="16/9" sizes="(min-width: 1024px) 380px, 144px" className="photo-fill" />
              </div>
              <div className="lg:border-t-4 lg:border-deep lg:pt-5">
                <h3 data-word className="text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] leading-[1.25] font-bold text-teal lg:mt-0">
                  {t(locale, `home.verbs.${n}.word`)}
                </h3>
                <p className="mt-1.5 text-body text-muted lg:mt-2">{t(locale, `home.verbs.${n}.line`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
