import { departments } from '@/lib/data/labels'
import type { Locale } from '@/lib/i18n/locale'
import { t, type StringKey } from '@/lib/i18n/t'

/** `code` is set on department items, so menus can show the department's icon */
export type NavItem = { href: string; label: string; code?: string }

/** Header links (dev-1 D1-5), resolved to Arabic on the server. */
export function primaryNav(locale: Locale): NavItem[] {
  return [
    { href: '/events', label: t(locale, 'nav.events') },
    { href: '/library', label: t(locale, 'nav.library') },
    { href: '/talent', label: t(locale, 'nav.talent') },
  ]
}

export function departmentNav(locale: Locale): NavItem[] {
  return departments.map((d) => ({ href: `/departments/${d.slug}`, label: t(locale, `dept.${d.code}.title` as StringKey), code: d.code }))
}
