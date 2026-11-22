import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { SectionMarks } from '@/components/brand/SectionMarks'
import { Bdi } from '@/components/Bdi'
import { primaryNav } from '@/components/nav-items'
import { CONTACT_EMAIL } from '@/lib/config/contact'
import { t } from '@/lib/i18n/t'

/* enough merlons for a 2,700 px wide screen */
const MERLONS = 60

/**
 * Site footer (dev-1 D1-5, revision 04 §4.7): compact and in normal flow. Crenellations on its top
 * edge, the approved closing line (large, not giant), the links and the contact, then the logo and
 * the university. D1-6 adds <NewsletterForm/> in its slot.
 */
export function Footer() {
  const closing = t('brand.closing')
  const quoted = closing.startsWith('«') && closing.endsWith('»')
  const link = 'inline-flex min-h-11 items-center font-semibold text-white no-underline'
  return (
    <footer data-band="dark" className="on-dark relative bg-deep-600 text-on-dark">
      {/* crenellations: deep merlons rising into the page colour */}
      <div aria-hidden="true" className="flex h-(--sq) gap-(--sq) overflow-hidden bg-page ps-[calc(var(--sq)/2)]">
        {Array.from({ length: MERLONS }, (_, i) => (
          <span key={i} className="size-(--sq) shrink-0 bg-deep-600" />
        ))}
      </div>
      <div className="wrap pt-12 pb-8 lg:pt-14">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-12 lg:items-end">
          <p data-closing className="text-[clamp(1.5rem,1.05rem+1.7vw,2.375rem)] leading-[1.5] font-bold text-balance text-white lg:col-span-7">
            {quoted ? (
              <>
                <span className="text-mint">«</span>
                {closing.slice(1, -1)}
                <span className="text-mint">»</span>
              </>
            ) : (
              closing
            )}
          </p>
          <nav aria-label={t('footer.nav')} className="lg:col-span-5">
            {/* D1-6: <NewsletterForm /> (the alert list) goes here, above the links */}
            <ul className="m-0 grid list-none grid-cols-2 gap-x-8 p-0">
              {primaryNav().map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={link}>
                    <span className="draw-line pb-0.5">{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/privacy" className={link}>
                  <span className="draw-line pb-0.5">{t('footer.privacy')}</span>
                </Link>
              </li>
              {/* the stand-in photos' licences ask for the credit to stay with the site */}
              <li>
                <Link href="/credits" className={link}>
                  <span className="draw-line pb-0.5">{t('footer.credits')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-10 gap-y-5 border-t border-teal-100/15 pt-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Logo tone="reversed" height={44} idPrefix="footer" title={t('brand.name')} />
            <p className="flex items-center gap-3 text-label">
              <SectionMarks />
              {t('brand.university')}
            </p>
          </div>
          <p className="flex min-h-11 flex-wrap items-center gap-x-2">
            <span>{t('footer.contact')}</span>
            <a href={`mailto:${CONTACT_EMAIL.toLowerCase()}`} className="font-semibold text-mint no-underline">
              <span className="draw-line pb-0.5">
                <Bdi lang="en">{CONTACT_EMAIL.toLowerCase()}</Bdi>
              </span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
