import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { HeaderNav } from '@/components/HeaderNav'
import { HeaderShell } from '@/components/HeaderShell'
import { MobileMenu } from '@/components/MobileMenu'
import { AccountMenu } from '@/components/AccountMenu'
import { Icon } from '@/components/ui/Icon'
import { buttonClass } from '@/components/ui/button'
import { departmentNav, primaryNav } from '@/components/nav-items'
import { t } from '@/lib/i18n/t'

/**
 * Site header (dev-1 D1-5, redesign §4). Fixed over the page: transparent over dark heads, a solid
 * deep bar over light content, hidden on scroll down (HeaderShell). The sign-in / account entry
 * is always visible and never inside the mobile menu. Below 360 px it collapses to an icon with
 * its full accessible name (WCAG 1.4.10).
 */
export function Header(props: { session: { email: string } | null }) {
  const items = primaryNav()
  const departments = departmentNav()
  return (
    <HeaderShell>
      <div className="wrap flex h-(--header-h) items-center gap-4">
        <Link href="/" aria-label={t('header.home')} className="relative z-10 shrink-0">
          <Logo tone="reversed" height={38} idPrefix="header" className="lg:h-[50px] lg:w-auto" />
        </Link>
        <HeaderNav label={t('header.nav')} departmentsLabel={t('nav.departments')} departments={departments} items={items} />
        <div className="relative z-10 ms-auto flex items-center gap-2">
          <div data-testid="auth-entry">
            {props.session ? (
              <AccountMenu email={props.session.email} labels={{ account: t('auth.account'), menu: t('auth.accountMenu') }} />
            ) : (
              <Link href="/sign-in" className={buttonClass({ variant: 'secondary', tone: 'dark', size: 'sm', className: 'max-[359px]:w-11 max-[359px]:px-0' })}>
                <Icon icon={LogIn} size={18} mirror className="hidden max-[359px]:block" />
                <span className="max-[359px]:sr-only">{t('auth.signIn')}</span>
              </Link>
            )}
          </div>
          <MobileMenu
            labels={{ open: t('nav.menuOpen'), close: t('nav.menuClose'), nav: t('header.nav'), departments: t('nav.departments'), university: t('brand.university') }}
            departments={departments}
            items={items}
          />
        </div>
      </div>
    </HeaderShell>
  )
}
