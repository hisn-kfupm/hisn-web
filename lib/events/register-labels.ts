import { pluralForms, type PluralCategory } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'

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

export function registerLabels(): RegisterLabels {
  return {
    region: t('register.region'),
    open: t('register.open'),
    almostFull: t('event.badge.almostFull'),
    registered: t('register.registered'),
    cancel: t('register.cancel'),
    full: t('register.full'),
    join: t('waitlist.join'),
    position: t('waitlist.position', { n: '{n}' }),
    leave: t('waitlist.leave'),
    onWaitlist: t('waitlist.on'),
    closed: t('register.closed'),
    cancelledEvent: t('register.cancelledEvent'),
    ended: t('register.ended'),
    watchRecording: t('event.watchRecording'),
    yourBrick: t('register.yourBrick'),
    seatsOpen: t('event.seats.open'),
    seatsLeft: pluralForms('seats.left'),
    note: {
      open: t('register.note.open'),
      signIn: t('register.note.signIn'),
      registered: t('register.note.registered'),
      full: t('register.note.full'),
      waitlisted: t('register.note.waitlisted'),
      closed: t('register.note.closed'),
      cancelled: t('register.note.cancelled'),
      ended: t('register.note.ended'),
    },
    pending: t('register.pending'),
    notice: { error: t('register.error'), started: t('register.started'), notFound: t('register.notFound') },
    confirm: {
      cancel: { title: t('register.confirm.cancel.title'), body: t('register.confirm.cancel.body'), yes: t('register.confirm.cancel.yes') },
      leave: { title: t('register.confirm.leave.title'), body: t('register.confirm.leave.body'), yes: t('register.confirm.leave.yes') },
      keep: t('register.confirm.keep'),
    },
  }
}
