import { LanguageLink } from '@/components/LanguageLink'
import type { Locale } from '@/lib/i18n/locale'
import { t } from '@/lib/i18n/t'

/**
 * The language switcher (dev-1 D1-5, spec §6.3, §6.6): «English» on Arabic pages, «العربية» on
 * English ones, opening the same page in that language with its query
 * (/ar/events?m=2026-12 ↔ /en/events?m=2026-12). It sits in the header bar and in the mobile menu.
 *
 * dev-1 marks it 'use client'. The part that reads the address is (LanguageLink); this half
 * stays on the server to pick the label with t(), so ar.json and en.json don't ship to the
 * browser for it. The header passes it into the client mobile menu as a rendered element.
 */
export function LanguageSwitcher({ locale, variant = 'bar' }: { locale: Locale; variant?: 'bar' | 'menu' }) {
  const target: Locale = locale === 'ar' ? 'en' : 'ar'
  return <LanguageLink target={target} label={t(locale, 'lang.switch')} variant={variant} />
}
