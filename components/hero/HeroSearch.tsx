'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { ArrowGlyph } from '@/components/ui/ArrowGlyph'
import { Icon } from '@/components/ui/Icon'
import { MajorSearch, type SearchLabels, type SearchMajor } from './MajorSearch'
import type { Locale } from '@/lib/i18n/locale'
import { localePath } from '@/lib/i18n/paths'

export type FoundLabels = { title: string; events: string; departments: string; close: string }

/** light the wall's major bricks: matches while typing, the chosen one in mint */
function lightBricks(codes: string[] | null, picked: string | null) {
  document.querySelectorAll<HTMLElement>('[data-mosaic] [data-major]').forEach((brick) => {
    const code = brick.dataset.major!
    brick.toggleAttribute('data-lit', !!codes?.includes(code) && code !== picked)
    brick.toggleAttribute('data-picked', code === picked)
  })
}

/**
 * The hero's second path (revision 04 §4.1): the major search, and the card that answers it.
 * Choosing a major shows «لتخصصك مكان في حصن» with the two ways on (the events and the
 * departments) in place of the list; Escape or the close button returns to the field.
 */
export function HeroSearch({ locale, majors, labels, foundLabels }: { locale: Locale; majors: SearchMajor[]; labels: SearchLabels; foundLabels: FoundLabels }) {
  const input = useRef<HTMLInputElement>(null)
  const rest = useRef<(() => void) | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const [found, setFound] = useState<SearchMajor | null>(null)

  /** refocus: back to the field (close button, Escape), but not when a link takes the visitor on */
  const close = useCallback((refocus = true) => {
    setFound(null)
    lightBricks(null, null)
    rest.current?.()
    if (refocus) input.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!found) return
    card.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [found, close])

  return (
    <div className="relative w-full max-w-[29rem]">
      <MajorSearch locale={locale}
        majors={majors}
        labels={labels}
        inputRef={input}
        restRef={rest}
        onQuery={(codes) => {
          if (found) setFound(null)
          lightBricks(codes, null)
        }}
        onPick={(m) => {
          setFound(m)
          lightBricks([m.code], m.code)
        }}
      />
      {found && (
        <div
          ref={card}
          tabIndex={-1}
          role="group"
          aria-labelledby="found-title"
          className="found-card absolute inset-x-0 top-full z-30 mt-1 border-t-4 border-mint bg-deep-700 p-5 shadow-[0_24px_40px_-16px_rgb(0_8_10/0.9)] outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <p id="found-title" className="text-[1.1875rem] leading-[1.45] font-bold text-white">
              {foundLabels.title}
              <span className="mt-1 block text-small font-semibold text-mint-200">{found[locale]}</span>
            </p>
            <button type="button" onClick={() => close()} aria-label={foundLabels.close} className="-me-2 -mt-2 grid size-11 shrink-0 place-items-center text-teal-100 hover:text-white">
              <Icon icon={X} size={18} />
            </button>
          </div>
          <ul className="mt-4 grid list-none gap-px p-0 sm:grid-cols-2">
            <li>
              <Link href={localePath(locale, '/events')} className="group flex min-h-12 items-center justify-between gap-3 bg-mid px-4 font-semibold text-white no-underline hover:bg-teal">
                {foundLabels.events}
                <ArrowGlyph />
              </Link>
            </li>
            <li>
              <Link href="#departments" onClick={() => close(false)} className="group flex min-h-12 items-center justify-between gap-3 bg-mid px-4 font-semibold text-white no-underline hover:bg-teal">
                {foundLabels.departments}
                <ArrowGlyph />
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
