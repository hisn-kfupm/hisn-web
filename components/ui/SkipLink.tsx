import { t } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

/** First focusable element on every page; jumps past the header to <main id="main">. */
export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a
      href="#main"
      className="absolute start-4 -top-24 z-50 bg-white px-4 py-3 font-semibold text-deep focus:top-4"
    >
      {t(locale, 'a11y.skip')}
    </a>
  )
}
