import type { Locale } from '@/lib/i18n/locale'

/** the kinds of email_deliveries rows (dev-2 D2-3, spec §10.1); one template per kind per language */
export const DELIVERY_KINDS = [
  'announcement',
  'confirmation',
  'promoted',
  'waitlist_joined',
  'cancel_confirmation',
  'event_cancelled',
  'event_changed',
] as const

export type DeliveryKind = (typeof DELIVERY_KINDS)[number]

/** An event as the email templates show it, already in the email's language (D2-8 builds it). */
export type EventEmailData = {
  id: number
  title: string
  /** UTC ISO times; the templates show them in Riyadh time */
  startsAt: string
  endsAt: string
  format: 'in_person' | 'online'
  location: string | null
  /** shown only in Confirmation, Promoted and EventChanged, and only for an online event */
  meetingUrl: string | null
  presenter: string | null
  /** `${SITE_URL}/${locale}/events/${id}` */
  url: string
  /** 'ar' when an English email falls back to the Arabic title */
  titleLang: Locale
}

/* The templates' props, the same in both languages. Links come in built with the delivery's locale (D2-8). */
export type ConfirmationProps = { name: string; event: EventEmailData; cancelUrl: string }
export type PromotedProps = { name: string; event: EventEmailData; cancelUrl: string }
export type WaitlistJoinedProps = { name: string; event: EventEmailData; position: number; leaveUrl: string }
export type CancelConfirmationProps = { name: string; event: EventEmailData; wasWaitlisted: boolean }
export type EventCancelledProps = { name: string; event: EventEmailData }
/** shows the full updated details */
export type EventChangedProps = { name: string; event: EventEmailData; cancelUrl: string }
export type AnnouncementProps = { event: EventEmailData; unsubscribeUrl: string }
