import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EventCard } from '@/components/EventCard'
import type { PublicEvent } from '@/lib/events/types'
import { t } from '@/lib/i18n/t'

const event: PublicEvent = {
  id: 42,
  title: 'مدخل إلى هندسة الأنظمة',
  description: '',
  departmentCode: 'SYSTEMS_INTEGRATION',
  startsAt: '2026-11-18T15:00:00Z',
  endsAt: '2026-11-18T17:00:00Z',
  format: 'in_person',
  location: 'مبنى 58 · قاعة 102',
  presenter: null,
  capacity: 30,
  registrationClosesAt: '2026-11-18T15:00:00Z',
  status: 'published',
  imageUrl: null,
  recordingUrl: null,
}

describe('EventCard', () => {
  it('links the title to the event page and names the full date for screen readers', () => {
    render(<EventCard event={event} variant="upcoming" />)
    const link = screen.getByRole('link', { name: /مدخل إلى هندسة الأنظمة/ })
    expect(link.getAttribute('href')).toBe('/events/42')
    expect(link.textContent).toContain('١٨ نوفمبر ٢٠٢٦')
  })

  it('shows the department, the Riyadh time range and the place', () => {
    const { container } = render(<EventCard event={event} variant="upcoming" />)
    expect(container.textContent).toContain(t('dept.SYSTEMS_INTEGRATION.title'))
    expect(container.textContent).toContain('٦:٠٠–٨:٠٠')
    expect(container.textContent).toContain('مبنى ٥٨ · قاعة ١٠٢')
  })

  it('hides the visual date block from screen readers', () => {
    const { container } = render(<EventCard event={event} variant="upcoming" />)
    const block = container.querySelector('[data-testid="date-block"]')
    expect(block?.getAttribute('aria-hidden')).toBe('true')
    expect(block?.textContent).toContain('١٨')
  })

  it('says "online" instead of a place for online events', () => {
    const { container } = render(<EventCard event={{ ...event, format: 'online', location: null }} variant="upcoming" />)
    expect(container.textContent).toContain(t('event.format.online'))
  })

  it('upcoming: invites to the details, with no seat claim', () => {
    // the homepage is cached for an hour, so it never states seats or "open" (dev-1 D1-10 adds live seats)
    const { container } = render(<EventCard event={event} variant="upcoming" />)
    expect(container.textContent).toContain(t('event.card.details'))
    expect(container.textContent).not.toContain('مقعد')
  })

  it('recording: marks it ended and links to the library', () => {
    render(<EventCard event={{ ...event, recordingUrl: 'https://youtu.be/abc' }} variant="recording" />)
    expect(screen.getByText(t('event.badge.ended'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t('event.watchRecording') }).getAttribute('href')).toBe('/library')
  })

  it('cancelled: says so, whatever the variant', () => {
    const { container } = render(<EventCard event={{ ...event, status: 'cancelled' }} variant="upcoming" />)
    expect(within(container).getByText(t('event.badge.cancelled'))).toBeInTheDocument()
    expect(container.textContent).not.toContain(t('event.card.details'))
  })

  it('omits the department line when the event has none', () => {
    const { container } = render(<EventCard event={{ ...event, departmentCode: null }} variant="upcoming" />)
    expect(container.querySelector('[data-testid="event-dept"]')).toBeNull()
  })
})
