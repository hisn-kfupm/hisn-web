import { SectionMarks } from '@/components/brand/SectionMarks'
import { LinkButton } from '@/components/ui/Buttons'
import { Photo } from '@/components/ui/Photo'
import { images } from '@/lib/data/images'
import { t } from '@/lib/i18n/t'

/** the guide's line with its second sentence as the mint accent */
function line(text: string) {
  const cut = text.indexOf('.') + 1
  if (cut <= 0 || cut >= text.length) return text
  return (
    <>
      {text.slice(0, cut)}{' '}
      <span className="text-mint">{text.slice(cut).trim()}</span>
    </>
  )
}

/**
 * «قاعدة المواهب», the invitation (revision 04 §4.6): one split band on the light page, a photo on
 * one side and a deep block on the other with the guide's youthful line, one sentence and one call
 * to action. Reused on the event page.
 */
export function TalentBand({ className }: { className?: string }) {
  const photo = images.talent
  return (
    <section data-testid="talent" aria-labelledby="talent-title" className={`bg-page pb-14 lg:pb-20 ${className ?? ''}`}>
      <div className="wrap grid lg:grid-cols-2">
        <div className="relative aspect-video lg:aspect-auto">
          <Photo image={photo} alt={t(photo.alt)} ratio="16/9" sizes="(min-width: 1024px) 600px, 100vw" className="photo-fill" />
        </div>
        <div className="on-dark flex flex-col items-start justify-center bg-deep px-6 py-9 text-on-dark sm:px-10 lg:px-14 lg:py-14">
          <p className="mb-4 flex items-center gap-3 text-label text-mint-200">
            <SectionMarks />
            {t('nav.talent')}
          </p>
          <h2 id="talent-title" className="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.4] font-bold text-balance text-white">
            {line(t('home.talent.line'))}
          </h2>
          <p className="mt-4 max-w-[30rem] text-body">{t('home.talent.body')}</p>
          <LinkButton href="/talent" tone="dark" size="lg" arrow className="mt-7">
            {t('home.talent.cta')}
          </LinkButton>
        </div>
      </div>
    </section>
  )
}
