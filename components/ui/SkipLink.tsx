import { t } from '@/lib/i18n/t'

/** First focusable element on every page; jumps past the header to <main id="main">. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="absolute start-4 -top-24 z-50 bg-white px-4 py-3 font-semibold text-deep focus:top-4"
    >
      {t('a11y.skip')}
    </a>
  )
}
