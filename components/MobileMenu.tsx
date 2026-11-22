'use client'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { SectionMarks } from '@/components/brand/SectionMarks'
import { deptIcon } from '@/lib/data/dept-icons'
import type { NavItem } from '@/components/nav-items'

type Props = {
  labels: { open: string; close: string; nav: string; departments: string; university: string }
  departments: NavItem[]
  items: NavItem[]
}

const FOCUSABLE = 'a[href], button:not([disabled])'

/**
 * Mobile navigation (<1024 px): a full-screen deep panel under the header bar, whose items drop
 * in like bricks. Focus moves into the panel, Tab cycles between the toggle and the panel's links,
 * Escape closes and returns focus to the toggle. The sign-in button is NOT in here: it stays in
 * the header bar (dev-1 D1-5), so `data-testid="auth-entry"` is never a descendant of this panel.
 */
export function MobileMenu({ labels, departments, items }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const pathname = usePathname()

  const close = useCallback((focusButton = false) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }, [])

  // close on navigation
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    const root = document.documentElement
    if (!open) {
      delete root.dataset.menu
      return
    }
    root.dataset.menu = 'open'
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(true)
        return
      }
      if (e.key !== 'Tab' || !panelRef.current || !buttonRef.current) return
      const ring = [buttonRef.current, ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const at = ring.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (at <= 0 ? ring.length - 1 : at - 1) : at === ring.length - 1 ? 0 : at + 1
      e.preventDefault()
      ring[next].focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      root.style.overflow = prevOverflow
      delete root.dataset.menu
    }
  }, [open, close])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? labels.close : labels.open}
        className="grid size-11 place-items-center border border-teal-100/40 text-white transition-colors hover:border-mint lg:hidden"
      >
        <Icon icon={open ? X : Menu} size={22} />
      </button>
      <nav
        ref={panelRef}
        id={id}
        hidden={!open}
        aria-label={labels.nav}
        data-testid="mobile-menu"
        className="mobile-panel fixed inset-0 z-[-1] overflow-y-auto overscroll-contain bg-deep-700 pt-(--header-h) lg:hidden"
      >
        <div className="wrap relative flex min-h-full flex-col pt-6 pb-10">
          <ul className="drop-in m-0 list-none p-0">
            {items.map((item, i) => (
              <li key={item.href} style={{ '--i': i + 1 } as CSSProperties} className="border-t-2 border-teal-700 first:border-mint">
                <Link href={item.href} onClick={() => close()} className="group flex min-h-18 items-center justify-between gap-4 py-3 text-[2rem] leading-[1.25] font-bold text-white no-underline">
                  {item.label}
                  <span className="text-mint"><ArrowGlyph size={26} /></span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-9 mb-3 flex items-center gap-3 text-label text-mint-200">
            <SectionMarks />
            {labels.departments}
          </p>
          <ul className="drop-in m-0 grid list-none grid-cols-2 gap-1.5 p-0" data-testid="mobile-dept-menu">
            {departments.map((d, i) => (
              <li key={d.href} style={{ '--i': i + items.length + 2 } as CSSProperties}>
                <Link href={d.href} onClick={() => close()} className="flex h-full min-h-22 flex-col justify-between gap-2 border-t-2 border-teal-500 bg-mid p-3 text-[0.9375rem] leading-[1.4] font-semibold text-white no-underline active:bg-teal-700">
                  <Icon icon={deptIcon(d.code ?? null)} size={20} className="text-mint" />
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-auto flex items-center gap-3 pt-10 text-label text-on-dark">
            <SectionMarks />
            {labels.university}
          </p>
        </div>
      </nav>
    </>
  )
}
