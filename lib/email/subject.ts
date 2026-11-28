import type { DeliveryKind } from '@/lib/email/types'
import type { Locale } from '@/lib/i18n/locale'
import { t } from '@/lib/i18n/t'

/**
 * An email's subject in its language (dev-2 D2-3): t(locale, `email.${kind}.subject`, vars). vars.title is the
 * title shown in that language, the Arabic one when an English email falls back to it. A subject is one line,
 * so a line break inside a title becomes a space.
 */
export function subject(kind: DeliveryKind, locale: Locale, vars: { title: string }): string {
  return t(locale, `email.${kind}.subject`, { title: vars.title.replace(/[\r\n]+/g, ' ') })
}
