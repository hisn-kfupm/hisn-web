import { departments } from '@/lib/data/labels'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'
import { t, type StringKey } from '@/lib/i18n/t'

/** `code` is set on department items, so menus can show the department's icon */
export type NavItem = { href: string; label: string; code?: string }

/** Header links (dev-1 D1-5), resolved on the server in the page's language, addresses included. */
export function primaryNav(locale: Locale): NavItem[] {
  return [
    { href: localePath(locale, '/events'), label: t(locale, 'nav.events') },
    { href: localePath(locale, '/library'), label: t(locale, 'nav.library') },
    { href: localePath(locale, '/talent'), label: t(locale, 'nav.talent') },
  ]
}

export function departmentNav(locale: Locale): NavItem[] {
  return departments.map((d) => ({ href: localePath(locale, `/departments/${d.slug}`), label: t(locale, `dept.${d.code}.title` as StringKey), code: d.code }))
}
