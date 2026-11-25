import { Bdi } from '@/components/Bdi'
import type { Locale } from '@/lib/i18n/locale'
import { arabicDigits, isArabicText } from '@/lib/i18n/number'

/**
 * An event's place (or presenter). Arabic text reads in Eastern Arabic digits («مبنى ٥٨ · قاعة ١٠٢»)
 * and Latin text keeps its own. Text in the page's script reads plain; text in the other script is
 * isolated in <Bdi> with its language (dev-1 D1-5): a Latin place on an Arabic page, an Arabic one
 * on an English page.
 */
export function Place({ text, locale }: { text: string; locale: Locale }) {
  const arabic = isArabicText(text)
  const shown = arabic ? arabicDigits(text) : text
  if (arabic === (locale === 'ar')) return <>{shown}</>
  return <Bdi lang={arabic ? 'ar' : 'en'}>{shown}</Bdi>
}
