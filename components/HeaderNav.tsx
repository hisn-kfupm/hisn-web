'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { useDisclosure } from '@/components/ui/useDisclosure'
import { deptIcon } from '@/lib/data/dept-icons'
import { LOCALES } from '@/lib/i18n/locale'
import type { NavItem } from '@/components/nav-items'

type Props = {
  label: string
  departmentsLabel: string
  departments: NavItem[]
  items: NavItem[]
}

/*
  Both sides lose their /ar or /en prefix before comparing, so the current tab is marked on both
  languages' pages with today's unprefixed links and with the localePath() links D1-5 brings.
*/
const LOCALE_PREFIX = new RegExp(`^/(?:${LOCALES.join('|')})(?=/|$)`)
const withoutLocale = (path: string) => path.replace(LOCALE_PREFIX, '') || '/'
const isCurrent = (pathname: string | null, href: string) => {
  if (!pathname) return false
  const path = withoutLocale(pathname)
  const target = withoutLocale(href)
  return path === target || path.startsWith(target + '/')
}
const arabicDigits = new Intl.NumberFormat('ar-SA-u-nu-arab', { minimumIntegerDigits: 2 })

/** Desktop navigation (≥1024 px). Strings arrive as props so ar.json never ships to the browser. */
export function HeaderNav({ label, departmentsLabel, departments, items }: Props) {
  const pathname = usePathname()
  const { open: deptOpen, close: closeDept, toggle: toggleDept, id: deptId, buttonRef, panelRef } = useDisclosure<HTMLButtonElement, HTMLUListElement>()
  const deptCurrent = departments.some((d) => isCurrent(pathname, d.href))
  const link = 'inline-flex min-h-11 items-center gap-1.5 px-3 text-[1.0625rem] font-medium text-on-dark no-underline transition-colors hover:text-white aria-[current=page]:text-white'

  return (
    <nav aria-label={label} className="relative z-10 ms-8 hidden items-center gap-1 lg:flex">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={deptOpen}
          aria-controls={deptId}
          onClick={toggleDept}
          className={`${link} group`}
        >
          <span className="draw-line pb-1" data-current={deptCurrent || undefined}>{departmentsLabel}</span>
          <Icon icon={ChevronDown} size={18} className={`transition-transform duration-300 ease-settle ${deptOpen ? 'rotate-180' : ''}`} />
        </button>
        <ul
          ref={panelRef}
          id={deptId}
          hidden={!deptOpen}
          data-testid="dept-menu"
          className="drop-in absolute start-0 top-[calc(100%+14px)] z-30 m-0 grid w-[34rem] list-none grid-cols-2 gap-px border-t-4 border-mint bg-teal-800 p-px shadow-[0_24px_48px_-12px_rgb(1_24_28/0.6)]"
        >
          {departments.map((d, i) => (
            <li key={d.href} style={{ '--i': i } as CSSProperties}>
              <Link
                href={d.href}
                onClick={() => closeDept()}
                aria-current={isCurrent(pathname, d.href) ? 'page' : undefined}
                className="group flex min-h-16 items-center gap-3 bg-deep-700 px-4 py-3 font-semibold text-white no-underline transition-colors hover:bg-mid aria-[current=page]:bg-mid"
              >
                <span aria-hidden="true" className="text-label text-mint">{arabicDigits.format(i + 1)}</span>
                <Icon icon={deptIcon(d.code ?? null)} size={20} className="text-mint-300" />
                <span className="draw-line pb-0.5">{d.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined} className={link}>
          <span className="draw-line pb-1" data-current={isCurrent(pathname, item.href) || undefined}>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
