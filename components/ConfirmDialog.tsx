'use client'
import { useEffect, useId, useRef, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/Buttons'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Escape, the cancel button, or a click on the backdrop */
  onCancel: () => void
  /** disables both buttons while the confirmed action runs */
  busy?: boolean
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A confirmation as a real modal <dialog> (dev-1 D1-11), never window.confirm. It opens with
 * showModal() so the rest of the page is inert, puts focus on the safe choice, keeps Tab inside,
 * closes on Escape, and gives focus back to whatever opened it. A deep brick that drops in.
 */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, busy = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null
      // jsdom and very old browsers have no showModal; the open attribute still shows it
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      keep.current?.focus()
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
      opener.current?.focus()
    }
  }, [open])

  // Escape fires 'cancel' on a modal dialog: keep the dialog under React's control
  const onNativeCancel = (e: SyntheticEvent) => {
    e.preventDefault()
    if (!busy) onCancel()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!busy) onCancel()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      onCancel={onNativeCancel}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
      className="confirm on-dark m-auto w-[min(32rem,calc(100%-2.5rem))] bg-deep p-0 text-on-dark"
    >
      <div className="confirm-brick px-6 pt-7 pb-6 sm:px-8 sm:pt-8">
        <h2 id={`${id}-title`} className="text-[1.5rem] leading-[1.4] font-bold text-white sm:text-[1.75rem]">{title}</h2>
        <p id={`${id}-body`} className="mt-3 text-body">{body}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button variant="primary" tone="dark" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
          <button ref={keep} type="button" onClick={onCancel} disabled={busy} className="min-h-11 px-1 font-semibold text-white underline-offset-8 hover:underline disabled:opacity-60">
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
