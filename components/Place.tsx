import { Bdi } from '@/components/Bdi'
import { arabicDigits, isArabicText } from '@/lib/i18n/number'

/**
 * An event's place. Arabic places read in Eastern Arabic digits («مبنى ٥٨ · قاعة ١٠٢»); a Latin
 * place keeps its own digits and is isolated in <Bdi lang="en">.
 */
export function Place({ text }: { text: string }) {
  return isArabicText(text) ? <>{arabicDigits(text)}</> : <Bdi lang="en">{text}</Bdi>
}
