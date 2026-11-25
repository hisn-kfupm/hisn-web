import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { HeaderNav } from '@/components/HeaderNav'
import { HeaderShell } from '@/components/HeaderShell'
import { MobileMenu } from '@/components/MobileMenu'
import { AccountMenu } from '@/components/AccountMenu'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Icon } from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/button'
import { departmentNav, primaryNav } from '@/components/nav-items'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'
import { t } from '@/lib/i18n/t'

/**
 * Site header (dev-1 D1-5, redesign §4). Fixed over the page: transparent over dark heads, a solid
 * deep bar over light content, hidden on scroll down (HeaderShell). The sign-in / account entry
 * is always visible and never inside the mobile menu. It keeps its label on one line (buttons
 * elsewhere may wrap); below 360 px it collapses to an icon with its full accessible name
 * (WCAG 1.4.10). Every link stays in the page's language (localePath), and
 * the language switcher sits in the bar (from 640 px) and in the mobile menu.
 */
export function Header(props: { locale: Locale; session: { email: string } | null }) {
  const { locale } = props
  const items = primaryNav(locale)
  const departments = departmentNav(locale)
  return (
    <HeaderShell>
      <div className="wrap flex h-(--header-h) items-center gap-4">
        <Link href={localePath(locale, '/')} aria-label={t(locale, 'header.home')} className="relative z-10 shrink-0">
          <Logo tone="reversed" height={38} idPrefix="header" className="lg:h-[50px] lg:w-auto" />
        </Link>
        <HeaderNav locale={locale} label={t(locale, 'header.nav')} departmentsLabel={t(locale, 'nav.departments')} departments={departments} items={items} />
        <div className="relative z-10 ms-auto flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <div data-testid="auth-entry">
            {props.session ? (
              <AccountMenu locale={locale} email={props.session.email} labels={{ account: t(locale, 'auth.account'), menu: t(locale, 'auth.accountMenu'), signOut: t(locale, 'auth.signOut') }} />
            ) : (
              <Link href={localePath(locale, '/sign-in')} className={buttonClass({ variant: 'secondary', tone: 'dark', size: 'sm', className: 'whitespace-nowrap max-[360px]:w-11 max-[360px]:px-0' })}>
                <Icon icon={LogIn} size={18} mirror className="hidden max-[360px]:block" />
                <span className="max-[360px]:sr-only">{t(locale, 'auth.signIn')}</span>
              </Link>
            )}
          </div>
          <MobileMenu
            labels={{ open: t(locale, 'nav.menuOpen'), close: t(locale, 'nav.menuClose'), nav: t(locale, 'header.nav'), departments: t(locale, 'nav.departments'), university: t(locale, 'brand.university') }}
            departments={departments}
            items={items}
            switcher={<LanguageSwitcher locale={locale} variant="menu" />}
          />
        </div>
      </div>
    </HeaderShell>
  )
}
