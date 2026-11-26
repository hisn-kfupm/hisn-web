'use client'
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { saveProfile } from '@/app/account/actions'
import { Button } from '@/components/ui/Buttons'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { academicLevels, label, majors } from '@/lib/data/labels'
import type { FieldErrors } from '@/lib/forms/types'
import type { Locale } from '@/lib/i18n/locale'
import { t } from '@/lib/i18n/t'
import type { ProfileInput } from '@/lib/profile/schema'

type Props = {
  locale: Locale
  open: boolean
  /** the close button or Escape; never while a save runs */
  onClose: () => void
  /** saveProfile returned { ok: true } */
  onSaved: () => void
}

type Fields = {
  full_name_ar: string
  major_code: string
  major_other: string
  academic_level_code: string
  gender: '' | 'male' | 'female'
  announcements_opt_in: boolean
}

/** spec §7.2: nothing chosen, nothing ticked */
const EMPTY: Fields = { full_name_ar: '', major_code: '', major_other: '', academic_level_code: '', gender: '', announcements_opt_in: false }

/** the fields with a control of their own, in the order they appear */
const ORDER = ['full_name_ar', 'major_code', 'major_other', 'academic_level_code', 'gender'] as const
type Field = (typeof ORDER)[number]

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const labelClass = 'mb-2.5 block text-label text-mint-200'
const fieldClass =
  'h-14 w-full border-[1.5px] border-teal-300/45 bg-deep-800/85 px-4 text-[1.0625rem] text-white transition-colors outline-none hover:border-teal-200/70 focus:border-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint aria-invalid:border-danger-bg'
const choiceClass = 'size-5 shrink-0 accent-mint'

/** an error on the dark overlay: text and an icon, never colour alone */
function Notice({ id, role, children }: { id?: string; role?: 'alert'; children: ReactNode }) {
  return (
    <div id={id} role={role} className="mt-3 flex items-start gap-2 border border-danger/25 bg-danger-bg px-3 py-2.5 text-small font-semibold text-danger">
      <Icon icon={CircleAlert} size={18} className="mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

/**
 * The profile step (dev-2 D2-7, spec §7.2) as a modal <dialog>, in the page's language: Arabic
 * name, major (with a typed major for «أخرى»), academic level, gender with nothing chosen, and the
 * announcements box unticked. There is no language field: the save carries the page's language,
 * which becomes the email language (changed later on /account). The server checks everything
 * (saveProfile) and names each problem, shown under its field. Opened by ProfileGateProvider
 * (lib/profile/gate.tsx), which stays mounted, so a closed overlay keeps what was typed.
 */
export function ProfileOverlay({ locale, open, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  /** set the moment a save starts, so a second tap before the re-render can't send it again */
  const saving = useRef(false)
  /** a save came back with errors: focus the first field that has one */
  const focusError = useRef(false)
  const id = useId()
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  /** one more on every save, so a repeated notice is a new alert and is read out again */
  const [attempt, setAttempt] = useState(0)
  const [pending, startTransition] = useTransition()

  const controlId = (field: Field) => (field === 'gender' ? `${id}-male` : `${id}-${field}`)
  const errorId = (field: Field) => `${id}-${field}-error`
  /** major_other has a field only while «أخرى» is the major */
  const shown = (field: Field) => field !== 'major_other' || fields.major_code === 'OTHER'

  useEffect(() => {
    const box = dialog.current
    if (!box) return
    if (open && !box.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      // jsdom has no showModal; the open attribute still shows it
      if (typeof box.showModal === 'function') box.showModal()
      else box.setAttribute('open', '')
      // the title first (read out with the intro), not a field: no keyboard pops up over the form
      title.current?.focus()
    } else if (!open && box.open) {
      if (typeof box.close === 'function') box.close()
      else box.removeAttribute('open')
      if (opener.current?.isConnected) opener.current.focus()
      opener.current = null
    }
  }, [open])

  useEffect(() => {
    if (!focusError.current) return
    focusError.current = false
    const first = ORDER.find((field) => errors[field] && shown(field))
    if (first) document.getElementById(controlId(first))?.focus()
  })

  const update = <K extends keyof Fields>(field: K, value: Fields[K]) => {
    setFields((now) => ({ ...now, [field]: value }))
    // the error on a changed field (and on the typed major, once the major changes) no longer applies
    setErrors((now) => {
      const stale = field === 'major_code' ? ['major_code', 'major_other'] : [field]
      if (!stale.some((key) => now[key])) return now
      const next = { ...now }
      for (const key of stale) delete next[key]
      return next
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setFailed(false)
    setAttempt((n) => n + 1)
    // sent as typed: saveProfile trims and checks it, and names every problem (a gender left
    // unchosen is its profile.error.gender)
    const input = {
      full_name_ar: fields.full_name_ar,
      major_code: fields.major_code,
      major_other: fields.major_code === 'OTHER' ? fields.major_other : null,
      academic_level_code: fields.academic_level_code,
      gender: fields.gender,
      announcements_opt_in: fields.announcements_opt_in,
      locale,
    } as ProfileInput
    startTransition(async () => {
      try {
        const result = await saveProfile(input)
        if (result.ok) {
          setErrors({})
          onSaved()
        } else {
          focusError.current = true
          setErrors({ ...result.errors })
        }
      } catch {
        // offline, or the server could not save (it reports that itself); what was typed stays
        setFailed(true)
      } finally {
        saving.current = false
      }
    })
  }

  // Escape fires 'cancel' on a modal dialog: keep the dialog under React's control
  const onCancel = (event: SyntheticEvent) => {
    event.preventDefault()
    if (!saving.current) onClose()
  }

  // a browser that closes the dialog itself (a repeated back gesture, say) closes it here too
  const onNativeClose = () => {
    if (open && !dialog.current?.open) onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!saving.current) onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const invalid = (field: Field) => (errors[field] ? true : undefined)
  const described = (field: Field) => (errors[field] ? errorId(field) : undefined)
  const problem = (field: Field) => {
    const key = errors[field]
    return key ? <Notice id={errorId(field)}>{t(locale, key)}</Notice> : null
  }
  // errors with no control on show: the form as a whole, the language, the checkbox
  const general = Object.entries(errors).flatMap(([field, key]) => (key && !((ORDER as readonly string[]).includes(field) && shown(field as Field)) ? [key] : []))
  const gender = { male: t(locale, 'profile.gender.male'), female: t(locale, 'profile.gender.female') }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onCancel={onCancel}
      onClose={onNativeClose}
      onKeyDown={onKeyDown}
      className="confirm on-dark m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] overflow-y-auto bg-deep p-0 text-on-dark [color-scheme:dark]"
    >
      <form onSubmit={submit} noValidate aria-busy={pending} className="relative px-6 pt-7 pb-8 sm:px-8 sm:pt-8">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label={t(locale, 'profile.close')}
          className="absolute end-2 top-2 grid size-11 place-items-center text-white transition-colors hover:text-mint-200 disabled:opacity-60"
        >
          <Icon icon={X} size={22} />
        </button>
        <h2 ref={title} id={`${id}-title`} tabIndex={-1} className="pe-10 text-[1.5rem] leading-[1.4] font-bold text-white outline-none sm:text-[1.75rem]">
          {t(locale, 'profile.title')}
        </h2>
        <p id={`${id}-intro`} className="mt-3 text-body">
          {t(locale, 'profile.intro')}
        </p>

        <div className="mt-7 flex flex-col gap-6">
          <div>
            <label htmlFor={controlId('full_name_ar')} className={labelClass}>
              {t(locale, 'profile.name')}
            </label>
            {/* the Arabic name on /en too, so it is written right to left */}
            <input
              id={controlId('full_name_ar')}
              name="full_name_ar"
              type="text"
              lang="ar"
              dir="rtl"
              autoComplete="off"
              required
              value={fields.full_name_ar}
              onChange={(event) => update('full_name_ar', event.target.value)}
              aria-invalid={invalid('full_name_ar')}
              aria-describedby={described('full_name_ar')}
              className={fieldClass}
            />
            {problem('full_name_ar')}
          </div>

          <div>
            <label htmlFor={controlId('major_code')} className={labelClass}>
              {t(locale, 'profile.major')}
            </label>
            <select
              id={controlId('major_code')}
              name="major_code"
              required
              value={fields.major_code}
              onChange={(event) => update('major_code', event.target.value)}
              aria-invalid={invalid('major_code')}
              aria-describedby={described('major_code')}
              className={fieldClass}
            >
              <option value="" disabled>
                {t(locale, 'profile.choose')}
              </option>
              {majors.map((major) => (
                <option key={major.code} value={major.code}>
                  {label('majors', major.code, locale)}
                </option>
              ))}
            </select>
            {problem('major_code')}
          </div>

          {fields.major_code === 'OTHER' && (
            <div>
              <label htmlFor={controlId('major_other')} className={labelClass}>
                {t(locale, 'profile.majorOther')}
              </label>
              <input
                id={controlId('major_other')}
                name="major_other"
                type="text"
                dir="auto"
                autoComplete="off"
                required
                value={fields.major_other}
                onChange={(event) => update('major_other', event.target.value)}
                aria-invalid={invalid('major_other')}
                aria-describedby={described('major_other')}
                className={fieldClass}
              />
              {problem('major_other')}
            </div>
          )}

          <div>
            <label htmlFor={controlId('academic_level_code')} className={labelClass}>
              {t(locale, 'profile.level')}
            </label>
            <select
              id={controlId('academic_level_code')}
              name="academic_level_code"
              required
              value={fields.academic_level_code}
              onChange={(event) => update('academic_level_code', event.target.value)}
              aria-invalid={invalid('academic_level_code')}
              aria-describedby={described('academic_level_code')}
              className={fieldClass}
            >
              <option value="" disabled>
                {t(locale, 'profile.choose')}
              </option>
              {academicLevels.map((level) => (
                <option key={level.code} value={level.code}>
                  {label('levels', level.code, locale)}
                </option>
              ))}
            </select>
            {problem('academic_level_code')}
          </div>

          <fieldset aria-describedby={described('gender')}>
            <legend className={labelClass}>{t(locale, 'profile.gender')}</legend>
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              {(['male', 'female'] as const).map((value) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-[1.0625rem] text-white">
                  <input
                    id={`${id}-${value}`}
                    type="radio"
                    name="gender"
                    value={value}
                    required
                    checked={fields.gender === value}
                    onChange={() => update('gender', value)}
                    className={choiceClass}
                  />
                  {gender[value]}
                </label>
              ))}
            </div>
            {problem('gender')}
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 text-body text-white">
            <input
              type="checkbox"
              name="announcements_opt_in"
              checked={fields.announcements_opt_in}
              onChange={(event) => update('announcements_opt_in', event.target.checked)}
              className={cn(choiceClass, 'mt-1')}
            />
            <span>{t(locale, 'profile.announcements')}</span>
          </label>
        </div>

        {(failed || general.length > 0) && (
          <Notice key={attempt} role="alert">
            {failed && <p>{t(locale, 'profile.error.failed')}</p>}
            {general.map((key) => (
              <p key={key}>{t(locale, key)}</p>
            ))}
          </Notice>
        )}
        {/* full width and wrapping on a phone: the label must never push the form sideways at 320 px */}
        <Button type="submit" tone="dark" arrow disabled={pending} className="mt-8 w-full whitespace-normal sm:w-auto">
          {t(locale, 'profile.save')}
        </Button>
      </form>
    </dialog>
  )
}
