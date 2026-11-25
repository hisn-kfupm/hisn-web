'use client'
import { Suspense, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Globe } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'
import { localeOfPath, switchLocalePath } from '@/lib/i18n/paths'

type Props = { target: Locale; label: string; variant: 'bar' | 'menu' }

const VARIANTS = {
  // the header bar: quiet, beside the sign-in button; phones use the one in the menu
  bar: 'hidden min-h-11 items-center gap-1.5 px-2 text-[0.9375rem] font-semibold text-on-dark no-underline transition-colors hover:text-white sm:inline-flex',
  menu: 'inline-flex min-h-12 items-center gap-2 border border-teal-100/40 px-4 text-[1.0625rem] font-semibold text-white no-underline transition-colors hover:border-mint active:bg-teal-700',
}

/**
 * The link half of LanguageSwitcher (dev-1 D1-5): the current page in `target`, query kept. It
 * reads the address, so it runs in the browser; the label comes from the server, so the string
 * files stay there. No link on a path without a language (/admin is Arabic only).
 *
 * A plain <a>, not next/link: the language is the root layout's segment, and a client-side
 * navigation keeps the previous language's whole document (header, main, footer) hidden in the
 * page, so a switch loads the new language's page fresh.
 */
export function LanguageLink({ target, label, variant }: Props) {
  const pathname = usePathname()
  if (!pathname || !localeOfPath(pathname)) return null
  const link = (href: string) => (
    <a href={href} lang={target} hrefLang={target} data-testid="language-switcher" className={cn('group', VARIANTS[variant])}>
      <Icon icon={Globe} size={variant === 'bar' ? 18 : 20} className="text-mint" />
      {label}
    </a>
  )
  // the query is known only in the browser: a prerendered page links without it, then fills it in
  return (
    <Suspense fallback={link(switchLocalePath(pathname, target))}>
      <WithQuery pathname={pathname} target={target} link={link} />
    </Suspense>
  )
}

function WithQuery({ pathname, target, link }: { pathname: string; target: Locale; link: (href: string) => ReactNode }) {
  const query = useSearchParams()?.toString()
  return link(switchLocalePath(query ? `${pathname}?${query}` : pathname, target))
}
