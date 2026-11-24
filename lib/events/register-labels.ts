import { pluralForms, type PluralCategory } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'
import type { Locale } from '@/lib/i18n/locale'

/** every string the register block shows, resolved on the server (client components take strings as props) */
export type RegisterLabels = {
  region: string
  open: string
  almostFull: string
  registered: string
  cancel: string
  full: string
  join: string
  /** «ترتيبك في قائمة الانتظار: {n}»; the client fills {n} with the position in Eastern digits */
  position: string
  /** waitlisted with no known position */
  onWaitlist: string
  leave: string
  closed: string
  cancelledEvent: string
  ended: string
  watchRecording: string
  yourBrick: string
  seatsOpen: string
  /** seats.left in its six plural forms, with {n} */
  seatsLeft: Record<PluralCategory, string>
  note: Record<'open' | 'signIn' | 'registered' | 'full' | 'waitlisted' | 'closed' | 'cancelled' | 'ended', string>
  pending: string
  notice: Record<'error' | 'started' | 'notFound', string>
  confirm: {
    cancel: { title: string; body: string; yes: string }
    leave: { title: string; body: string; yes: string }
    keep: string
  }
}

export function registerLabels(locale: Locale): RegisterLabels {
  return {
    region: t(locale, 'register.region'),
    open: t(locale, 'register.open'),
    almostFull: t(locale, 'event.badge.almostFull'),
    registered: t(locale, 'register.registered'),
    cancel: t(locale, 'register.cancel'),
    full: t(locale, 'register.full'),
    join: t(locale, 'waitlist.join'),
    position: t(locale, 'waitlist.position', { n: '{n}' }),
    leave: t(locale, 'waitlist.leave'),
    onWaitlist: t(locale, 'waitlist.on'),
    closed: t(locale, 'register.closed'),
    cancelledEvent: t(locale, 'register.cancelledEvent'),
    ended: t(locale, 'register.ended'),
    watchRecording: t(locale, 'event.watchRecording'),
    yourBrick: t(locale, 'register.yourBrick'),
    seatsOpen: t(locale, 'event.seats.open'),
    seatsLeft: pluralForms(locale, 'seats.left'),
    note: {
      open: t(locale, 'register.note.open'),
      signIn: t(locale, 'register.note.signIn'),
      registered: t(locale, 'register.note.registered'),
      full: t(locale, 'register.note.full'),
      waitlisted: t(locale, 'register.note.waitlisted'),
      closed: t(locale, 'register.note.closed'),
      cancelled: t(locale, 'register.note.cancelled'),
      ended: t(locale, 'register.note.ended'),
    },
    pending: t(locale, 'register.pending'),
    notice: { error: t(locale, 'register.error'), started: t(locale, 'register.started'), notFound: t(locale, 'register.notFound') },
    confirm: {
      cancel: { title: t(locale, 'register.confirm.cancel.title'), body: t(locale, 'register.confirm.cancel.body'), yes: t(locale, 'register.confirm.cancel.yes') },
      leave: { title: t(locale, 'register.confirm.leave.title'), body: t(locale, 'register.confirm.leave.body'), yes: t(locale, 'register.confirm.leave.yes') },
      keep: t(locale, 'register.confirm.keep'),
    },
  }
}
