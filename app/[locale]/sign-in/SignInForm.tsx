'use client'
import { useEffect, useId, useRef, useState, useTransition, type ClipboardEvent, type FormEvent, type ReactNode } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { sendCode, verifyCode } from '@/app/sign-in/actions'
import { Bdi } from '@/components/Bdi'
import { Button } from '@/components/ui/Buttons'
import { Icon } from '@/components/ui/Icon'
import { isInstitutionalEmail } from '@/lib/auth/return-to'
import type { SignInError, SignInLabels } from '@/lib/auth/sign-in-labels'
import { cn } from '@/lib/cn'
import type { Locale } from '@/lib/i18n/locale'
import { fmtNum, latinDigits } from '@/lib/i18n/number'

/** spec §7.1: the code can be sent again after 60 seconds */
const RESEND_AFTER_MS = 60_000
const CODE_LENGTH = 6

/** the code as Latin digits: an Arabic keypad types ٠–٩, and a pasted «123 456» keeps only its digits */
const cleanCode = (text: string) => latinDigits(text).replace(/\D/g, '').slice(0, CODE_LENGTH)

type Props = {
  locale: Locale
  /** where a right code leads; the page has already kept it same-site and in its language */
  returnTo: string
  /** signInLabels(locale), resolved on the server */
  labels: SignInLabels
}

const labelClass = 'mb-2.5 block text-label text-mint-200'
const fieldClass =
  'h-14 w-full border-[1.5px] border-teal-300/45 bg-deep-800/85 px-4 text-[1.0625rem] text-white transition-colors outline-none hover:border-teal-200/70 focus:border-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint'
const noteClass = 'mt-3 text-small text-on-dark'

/** an error or a warning on the dark band: text and an icon, never colour alone */
function Notice({ tone, id, role, children }: { tone: 'danger' | 'warning'; id?: string; role?: 'alert'; children: ReactNode }) {
  return (
    <p id={id} role={role} className={cn('mt-3 flex items-start gap-2 border px-3 py-2.5 text-small font-semibold', tone === 'danger' ? 'border-danger/25 bg-danger-bg text-danger' : 'border-warning/25 bg-warning-bg text-warning')}>
      <Icon icon={tone === 'danger' ? CircleAlert : TriangleAlert} size={18} className="mt-0.5" />
      <span>{children}</span>
    </p>
  )
}

/**
 * Sign-in in two steps (dev-2 D2-5, spec §7.1): an email, then the 6-digit code sent to it. Every
 * button is disabled while a request runs, so repeated taps on a slow connection send once.
 */
export function SignInForm({ locale, returnTo, labels }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  /** the address the last code went to */
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState<SignInError | null>(null)
  /** one more on every submit, so a repeated error is a new alert and is read out again */
  const [attempt, setAttempt] = useState(0)
  /** back from the code step: the email field takes the focus */
  const [back, setBack] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(0)
  const [pending, startTransition] = useTransition()
  const codeInput = useRef<HTMLInputElement>(null)
  const id = useId()

  // a tick a second until the code may be sent again
  useEffect(() => {
    if (!resendAt) return
    const timer = setInterval(() => {
      const tick = Date.now()
      setNow(tick)
      if (tick >= resendAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendAt])

  const send = () => {
    setError(null)
    setAttempt((n) => n + 1)
    startTransition(async () => {
      const address = email.trim()
      // sendCode never redirects, so a request that fails on the way is a failed send
      const result = await sendCode(email, locale).catch(() => ({ ok: false, reason: 'send_failed' }) as const)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      const sentAt = Date.now()
      setNow(sentAt)
      setResendAt(sentAt + RESEND_AFTER_MS)
      setSentTo(address)
      setCode('')
      setStep('code')
      codeInput.current?.focus() // after a resend; the first time the field mounts with autoFocus
    })
  }

  const verify = () => {
    setError(null)
    setAttempt((n) => n + 1)
    // a short code can't be right: don't spend one of Supabase's verification attempts on it
    if (code.length !== CODE_LENGTH) {
      setError('wrong')
      return
    }
    startTransition(async () => {
      try {
        const result = await verifyCode(sentTo, code, returnTo)
        if (result && !result.ok) setError(result.reason)
      } catch (thrown) {
        // A right code redirects: Next is already navigating and rejects with a redirect it has
        // handled. unstable_rethrow lets that through; anything else is offline or an outage.
        unstable_rethrow(thrown)
        setError('unavailable')
      }
    })
  }

  const submitEmail = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    // back from the code step with the same address, inside the wait: that code is still on its way
    if (email.trim() === sentTo && Date.now() < resendAt) {
      setError(null)
      setStep('code')
      return
    }
    send()
  }

  const submitCode = (event: FormEvent) => {
    event.preventDefault()
    if (!pending) verify()
  }

  const pasteCode = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    setCode(cleanCode(event.clipboardData.getData('text')))
  }

  const errorId = `${id}-error`
  const errorNotice = error && (
    <Notice key={attempt} tone="danger" role="alert" id={errorId}>
      {labels.errors[error]}
    </Notice>
  )

  if (step === 'email') {
    const university = isInstitutionalEmail(email.trim())
    return (
      <form onSubmit={submitEmail} noValidate aria-busy={pending} className="mt-8 max-w-[29rem]">
        <label htmlFor={`${id}-email`} className={labelClass}>
          {labels.email}
        </label>
        <input
          id={`${id}-email`}
          type="email"
          dir="ltr"
          autoComplete="email"
          spellCheck={false}
          autoFocus={back}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error === 'invalid' || undefined}
          aria-describedby={cn(`${id}-hint`, university && `${id}-warning`, error && errorId)}
          className={fieldClass}
        />
        <p id={`${id}-hint`} className={noteClass}>
          {labels.personalHint}
        </p>
        <div aria-live="polite">
          {university && (
            <Notice tone="warning" id={`${id}-warning`}>
              {labels.institutionalWarning}
            </Notice>
          )}
        </div>
        {errorNotice}
        <Button type="submit" tone="dark" arrow disabled={pending} className="mt-6">
          {labels.send}
        </Button>
      </form>
    )
  }

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const time = `${fmtNum(Math.floor(wait / 60), locale)}:${fmtNum(wait % 60, locale, { minimumIntegerDigits: 2 })}`
  return (
    <form onSubmit={submitCode} aria-busy={pending} className="mt-8 max-w-[29rem]">
      <p id={`${id}-sent`} className="text-body text-white">
        {labels.codeSentTo} <Bdi lang="en">{sentTo}</Bdi>
      </p>
      <label htmlFor={`${id}-code`} className={cn(labelClass, 'mt-6')}>
        {labels.code}
      </label>
      <input
        ref={codeInput}
        id={`${id}-code`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        dir="ltr"
        autoFocus
        value={code}
        onChange={(event) => setCode(cleanCode(event.target.value))}
        onPaste={pasteCode}
        aria-invalid={error === 'wrong' || error === 'expired' || undefined}
        aria-describedby={cn(`${id}-sent`, `${id}-junk`, error && errorId)}
        className={cn(fieldClass, 'tracking-[0.3em]')}
      />
      <p id={`${id}-junk`} className={noteClass}>
        {labels.checkJunk}
      </p>
      {errorNotice}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" tone="dark" arrow disabled={pending}>
          {labels.verify}
        </Button>
        <Button variant="secondary" tone="dark" disabled={pending || wait > 0} onClick={send}>
          {labels.resend}
        </Button>
      </div>
      {wait > 0 && <p className={noteClass}>{labels.resendIn.replace('{time}', time)}</p>}
      <Button
        variant="ghost"
        tone="dark"
        disabled={pending}
        onClick={() => {
          setError(null)
          setBack(true)
          setStep('email')
        }}
        className="mt-4"
      >
        {labels.changeEmail}
      </Button>
    </form>
  )
}
