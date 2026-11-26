'use client'
import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Search, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { SectionMarks } from '@/components/brand/SectionMarks'
import { pickPlural, type PluralCategory } from '@/lib/i18n/plural'
import { prefersReducedMotion } from '@/lib/motion/useReducedMotion'
import { dirFor, type Locale } from '@/lib/i18n/locale'

export type SearchMajor = { code: string; ar: string; en: string }
export type SearchLabels = {
  label: string
  placeholder: string
  /** a shorter placeholder for phones, where the full one would be cut */
  placeholderShort: string
  clear: string
  results: string
  counts: Record<PluralCategory, string>
  /** «وجدنا لبنتك: {name}» */
  found: string
}

type Props = {
  locale: Locale
  majors: SearchMajor[]
  labels: SearchLabels
  inputRef: RefObject<HTMLInputElement | null>
  /** matching codes while typing, null when the field is empty */
  onQuery: (codes: string[] | null) => void
  onPick: (major: SearchMajor) => void
  /** HeroSearch calls this after the result card closes: the list stays closed until the next keystroke */
  restRef?: RefObject<(() => void) | null>
}

const PHONE = '(max-width: 39.99rem)'
const ROW = 48

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const isPhone = () => window.matchMedia(PHONE).matches

/** Arabic-insensitive matching: no diacritics or tatweel, one alef, ة = ه, ى = ي */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchMajors(majors: SearchMajor[], query: string): SearchMajor[] {
  const q = normalise(query)
  if (!q) return []
  return majors.filter((m) => normalise(m.ar).includes(q) || normalise(m.en).includes(q) || m.code.toLowerCase() === q)
}

/**
 * «ما تخصصك؟» (revision 04 §4.1): a combobox over the majors, the hero's second path. Typing
 * lights the matching bricks in the wall; choosing one shows its result card (HeroSearch). Arrow keys move through the options, Enter
 * chooses, Escape closes the list and then clears. Results are announced through aria-live.
 */
export function MajorSearch({ locale, majors, labels, inputRef, onQuery, onPick, restRef }: Props) {
  const id = useId()
  const listId = `${id}-list`
  // each result shows its name in the page's language, with the other language under it
  const other: Locale = locale === 'ar' ? 'en' : 'ar'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState('')
  const matches = useMemo(() => matchMajors(majors, query), [majors, query])
  const shown = matches.slice(0, 7)
  const expanded = open && shown.length > 0
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const field = useRef<HTMLDivElement>(null)
  /** after a pulled brick goes back, focus returns here without reopening the old list */
  const quiet = useRef(false)

  useImperativeHandle(restRef, () => () => {
    quiet.current = true
    setOpen(false)
  })

  // the list always opens downward; when it would run past the bottom of the screen, the page
  // scrolls (natively) so the field sits under the header with its list in view
  useLayoutEffect(() => {
    if (!expanded) return
    const box = field.current?.getBoundingClientRect()
    if (box && box.bottom + Math.min(shown.length, 4) * ROW + 12 > window.innerHeight) {
      field.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }, [expanded, shown.length])

  const change = (value: string) => {
    quiet.current = false
    setQuery(value)
    setOpen(true)
    setActive(-1)
    const found = matchMajors(majors, value)
    onQuery(value.trim() ? found.map((m) => m.code) : null)
    setStatus(value.trim() ? pickPlural(locale, labels.counts, found.length) : '')
  }

  const pick = (m: SearchMajor) => {
    setQuery(m[locale])
    setOpen(false)
    setActive(-1)
    onQuery([m.code])
    setStatus(labels.found.replace('{name}', m[locale]))
    onPick(m)
  }

  const clear = () => {
    change('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!shown.length) return
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + shown.length) % shown.length)
    } else if (e.key === 'Enter') {
      const m = shown[active] ?? (shown.length === 1 ? shown[0] : null)
      if (m) {
        e.preventDefault()
        pick(m)
      }
    } else if (e.key === 'Escape') {
      if (expanded) setOpen(false)
      else if (query) clear()
    }
  }

  return (
    <div className="relative w-full max-w-[29rem]">
      <label htmlFor={id} className="mb-2.5 flex items-center gap-2.5 text-label text-mint-200">
        <SectionMarks />
        {labels.label}
      </label>
      <div ref={field} className="relative">
        <Icon icon={Search} size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-mint" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
          value={query}
          placeholder={phone ? labels.placeholderShort : labels.placeholder}
          onChange={(e) => change(e.target.value)}
          onFocus={() => query && !quiet.current && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-14 w-full border-[1.5px] border-teal-300/45 bg-deep-800/85 ps-12 pe-12 text-[1.0625rem] text-white transition-colors outline-none placeholder:text-teal-200/75 hover:border-teal-200/70 focus:border-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label={labels.clear}
            className="absolute end-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-teal-100 hover:text-white"
          >
            <Icon icon={X} size={18} />
          </button>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={labels.results}
          hidden={!expanded}
          className="drop-in absolute inset-x-0 top-full z-30 m-0 mt-1 max-h-72 list-none overflow-auto overscroll-contain border-t-2 border-mint bg-deep-700 p-0 shadow-[0_24px_40px_-16px_rgb(0_8_10/0.9)]"
        >
          {shown.map((m, i) => (
            <li
              key={m.code}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              style={{ '--i': i } as CSSProperties}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(m)
              }}
              onMouseEnter={() => setActive(i)}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-b border-teal-100/10 px-4 py-2 text-white aria-selected:bg-mid"
            >
              <span className="font-semibold">{m[locale]}</span>
              <span lang={other} dir={dirFor(other)} className="text-label text-teal-200">{m[other]}</span>
            </li>
          ))}
        </ul>
      </div>
      <p aria-live="polite" role="status" className="sr-only">{status}</p>
    </div>
  )
}
