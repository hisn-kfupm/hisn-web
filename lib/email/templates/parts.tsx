import type { CSSProperties, ReactNode } from 'react'
import { Button, Heading, Hr, Link, Section, Text } from '@react-email/components'
import type {
  AnnouncementProps,
  CancelConfirmationProps,
  ConfirmationProps,
  EventCancelledProps,
  EventChangedProps,
  EventEmailData,
  WaitlistJoinedProps,
} from '@/lib/email/types'
import { dirFor, type Locale } from '@/lib/i18n/locale'
import { arabicDigits, fmtNum, isArabicText } from '@/lib/i18n/number'
import { t } from '@/lib/i18n/t'
import { formatRiyadh, formatRiyadhTimeRange } from '@/lib/time/riyadh'

/*
  What the email templates share (dev-2 D2-3): the styles, the event's details and the body of each kind.
  Every template in ar/ and en/ wraps a body in its own language's Layout and passes its own locale, so all
  text comes from that language's string file. Names, links and the event come in as props; D2-8 builds them
  in the delivery's language. Email clients need inline styles, and these have no left or right: the
  direction comes from each layout's dir.
*/

export const FONT = "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
const TEAL = '#03606D'
const INK = '#012C33'
const PALE = '#F0F5F6'

export const styles = {
  body: { backgroundColor: PALE, fontFamily: FONT, margin: '0', padding: '24px 0' },
  container: { backgroundColor: '#FFFFFF', fontFamily: FONT, maxWidth: '560px', margin: '0 auto', padding: '32px 28px', borderRadius: '8px' },
  brand: { color: TEAL, fontSize: '22px', fontWeight: 700, lineHeight: '1.4', margin: '0 0 24px' },
  heading: { color: INK, fontSize: '22px', lineHeight: '1.4', margin: '0 0 16px' },
  text: { color: INK, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px' },
  card: { backgroundColor: PALE, borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' },
  title: { color: TEAL, fontSize: '18px', lineHeight: '1.5', margin: '0 0 12px' },
  fact: { color: INK, fontSize: '15px', lineHeight: '1.6', margin: '0 0 6px' },
  position: { color: TEAL, fontSize: '18px', fontWeight: 700, lineHeight: '1.5', margin: '0 0 16px' },
  link: { color: TEAL, textDecoration: 'underline' },
  button: { backgroundColor: TEAL, color: '#FFFFFF', fontWeight: 700, padding: '12px 22px', borderRadius: '6px', textDecoration: 'none' },
  rule: { borderColor: '#DCE9EB', margin: '24px 0 16px' },
  small: { color: '#3D5A60', fontSize: '13px', lineHeight: '1.6', margin: '0' },
} satisfies Record<string, CSSProperties>

/** the greeting, with the name isolated whatever its script */
function Greeting({ locale, name }: { locale: Locale; name: string }) {
  return (
    <Text style={styles.text}>
      {t(locale, 'email.greeting')} <bdi>{name}</bdi>
      {locale === 'ar' ? '،' : ','}
    </Text>
  )
}

function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>
}

/** one line of the details: its label, then the value */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text style={styles.fact}>
      <strong>{label}:</strong> {children}
    </Text>
  )
}

/** a place as the site shows it (components/Place.tsx): Arabic in Eastern Arabic digits, Latin as English; isolated */
function Place({ text }: { text: string }) {
  return isArabicText(text) ? <bdi>{arabicDigits(text)}</bdi> : <bdi lang="en">{text}</bdi>
}

/** the weekday and date in Riyadh time */
const weekdayDate = (iso: string, locale: Locale) =>
  [formatRiyadh(iso, 'weekday', locale), formatRiyadh(iso, 'date', locale)].join(locale === 'ar' ? '، ' : ', ')

/**
 * The event: title, date and time (Riyadh), place, presenter; with `meeting`, the meeting link of an online
 * event that has one; with `page`, the link to its page. A title in another language than the email (the
 * Arabic fallback in an English email) keeps its own language and direction.
 */
function EventDetails({ locale, event, meeting = false, page = true }: { locale: Locale; event: EventEmailData; meeting?: boolean; page?: boolean }) {
  const titleLanguage = event.titleLang === locale ? {} : { lang: event.titleLang, dir: dirFor(event.titleLang) }
  const online = event.format === 'online'
  return (
    <Section style={styles.card}>
      <Heading as="h2" style={styles.title} {...titleLanguage}>
        {event.title}
      </Heading>
      <Fact label={t(locale, 'email.event.date')}>{weekdayDate(event.startsAt, locale)}</Fact>
      <Fact label={t(locale, 'email.event.time')}>
        {formatRiyadhTimeRange(event.startsAt, event.endsAt, locale)} {t(locale, 'email.event.riyadhTime')}
      </Fact>
      {online ? (
        <Fact label={t(locale, 'email.event.place')}>{t(locale, 'email.event.online')}</Fact>
      ) : (
        event.location && (
          <Fact label={t(locale, 'email.event.place')}>
            <Place text={event.location} />
          </Fact>
        )
      )}
      {event.presenter && (
        <Fact label={t(locale, 'email.event.presenter')}>
          <bdi>{event.presenter}</bdi>
        </Fact>
      )}
      {meeting && online && event.meetingUrl && (
        <Fact label={t(locale, 'email.event.meetingLink')}>
          <Link href={event.meetingUrl} style={styles.link}>
            <bdi>{event.meetingUrl}</bdi>
          </Link>
        </Fact>
      )}
      {page && (
        <Text style={styles.fact}>
          <Link href={event.url} style={styles.link}>
            {t(locale, 'email.event.page')}
          </Link>
        </Text>
      )}
    </Section>
  )
}

/** a link on its own line, after the sentence that explains it */
function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Text style={styles.text}>
      <Link href={href} style={styles.link}>
        {children}
      </Link>
    </Text>
  )
}

function CancelLink({ locale, href }: { locale: Locale; href: string }) {
  return (
    <>
      <Paragraph>{t(locale, 'email.cancel.prompt')}</Paragraph>
      <ActionLink href={href}>{t(locale, 'email.cancel.link')}</ActionLink>
    </>
  )
}

/** Confirmation and Promoted: the same content (spec §7.5), each with its own heading and first line */
export function RegisteredBody({ locale, kind, name, event, cancelUrl }: ConfirmationProps & { locale: Locale; kind: 'confirmation' | 'promoted' }) {
  return (
    <>
      <Heading style={styles.heading}>{t(locale, `email.${kind}.heading`)}</Heading>
      <Greeting locale={locale} name={name} />
      <Paragraph>{t(locale, `email.${kind}.body`)}</Paragraph>
      <EventDetails locale={locale} event={event} meeting />
      <Paragraph>{t(locale, 'email.calendar')}</Paragraph>
      <CancelLink locale={locale} href={cancelUrl} />
    </>
  )
}

/** the place in the waitlist and the leave link; never the meeting link */
export function WaitlistJoinedBody({ locale, name, event, position, leaveUrl }: WaitlistJoinedProps & { locale: Locale }) {
  return (
    <>
      <Heading style={styles.heading}>{t(locale, 'email.waitlist_joined.heading')}</Heading>
      <Greeting locale={locale} name={name} />
      <Paragraph>{t(locale, 'email.waitlist_joined.body')}</Paragraph>
      <EventDetails locale={locale} event={event} />
      <Text style={styles.position}>{t(locale, 'email.waitlist_joined.position', { n: fmtNum(position, locale) })}</Text>
      <Paragraph>{t(locale, 'email.waitlist_joined.next')}</Paragraph>
      <Paragraph>{t(locale, 'email.waitlist_joined.leavePrompt')}</Paragraph>
      <ActionLink href={leaveUrl}>{t(locale, 'email.waitlist_joined.leave')}</ActionLink>
    </>
  )
}

/** a cancelled registration or waitlist place, and how to register again */
export function CancelConfirmationBody({ locale, name, event, wasWaitlisted }: CancelConfirmationProps & { locale: Locale }) {
  const what = wasWaitlisted ? 'waitlist' : 'registration'
  return (
    <>
      <Heading style={styles.heading}>{t(locale, `email.cancel_confirmation.heading.${what}`)}</Heading>
      <Greeting locale={locale} name={name} />
      <Paragraph>{t(locale, `email.cancel_confirmation.body.${what}`)}</Paragraph>
      <EventDetails locale={locale} event={event} />
      <Paragraph>{t(locale, 'email.cancel_confirmation.again')}</Paragraph>
    </>
  )
}

export function EventCancelledBody({ locale, name, event }: EventCancelledProps & { locale: Locale }) {
  return (
    <>
      <Heading style={styles.heading}>{t(locale, 'email.event_cancelled.heading')}</Heading>
      <Greeting locale={locale} name={name} />
      <Paragraph>{t(locale, 'email.event_cancelled.body')}</Paragraph>
      <EventDetails locale={locale} event={event} page={false} />
      <Paragraph>{t(locale, 'email.event_cancelled.nothing')}</Paragraph>
    </>
  )
}

/** the full updated details, with the meeting link of an online event, and the cancel link */
export function EventChangedBody({ locale, name, event, cancelUrl }: EventChangedProps & { locale: Locale }) {
  return (
    <>
      <Heading style={styles.heading}>{t(locale, 'email.event_changed.heading')}</Heading>
      <Greeting locale={locale} name={name} />
      <Paragraph>{t(locale, 'email.event_changed.body')}</Paragraph>
      <EventDetails locale={locale} event={event} meeting />
      <Paragraph>{t(locale, 'email.event_changed.calendar')}</Paragraph>
      <CancelLink locale={locale} href={cancelUrl} />
    </>
  )
}

/** no name (the recipient may have no account): the event, a register button, and the unsubscribe link */
export function AnnouncementBody({ locale, event, unsubscribeUrl }: AnnouncementProps & { locale: Locale }) {
  return (
    <>
      <Heading style={styles.heading}>{t(locale, 'email.announcement.heading')}</Heading>
      <Paragraph>{t(locale, 'email.announcement.body')}</Paragraph>
      <EventDetails locale={locale} event={event} page={false} />
      <Section style={{ margin: '0 0 8px' }}>
        <Button href={event.url} style={styles.button}>
          {t(locale, 'email.announcement.register')}
        </Button>
      </Section>
      <Hr style={styles.rule} />
      <Text style={styles.small}>
        {t(locale, 'email.announcement.why')}{' '}
        <Link href={unsubscribeUrl} style={styles.link}>
          {t(locale, 'email.announcement.unsubscribe')}
        </Link>
      </Text>
    </>
  )
}
