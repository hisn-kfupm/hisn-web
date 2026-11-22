import { describe, expect, it } from 'vitest'
import { eventButtonState } from '@/lib/events/state'
import type { PublicEvent } from '@/lib/events/types'

const event: PublicEvent = {
  id: 1,
  title: 'فعالية',
  description: '',
  departmentCode: null,
  startsAt: '2026-11-20T15:00:00Z',
  endsAt: '2026-11-20T17:00:00Z',
  format: 'in_person',
  location: null,
  presenter: null,
  capacity: 30,
  registrationClosesAt: '2026-11-20T15:00:00Z',
  status: 'published',
  imageUrl: null,
  recordingUrl: null,
}
const before = new Date('2026-11-19T10:00:00Z')
const during = new Date('2026-11-20T15:30:00Z')
const after = new Date('2026-11-20T18:00:00Z')

describe('eventButtonState', () => {
  it('cancelled beats everything, even your own registration', () => {
    expect(eventButtonState({ ...event, status: 'cancelled' }, 10, 'registered', before)).toBe('cancelled')
  })

  it('ended once the event is over', () => {
    expect(eventButtonState(event, 10, null, after)).toBe('ended')
    expect(eventButtonState(event, 10, 'registered', after)).toBe('ended')
    expect(eventButtonState(event, 10, null, new Date(event.endsAt))).toBe('ended')
  })

  it('shows your own registration after registration closes', () => {
    expect(eventButtonState(event, 10, 'registered', during)).toBe('registered')
  })

  it('closed after the closing time for everyone else', () => {
    expect(eventButtonState(event, 10, null, during)).toBe('closed')
    expect(eventButtonState(event, 10, null, new Date(event.registrationClosesAt))).toBe('closed')
  })

  it('full when no seats are left', () => {
    expect(eventButtonState(event, 0, null, before)).toBe('full')
  })

  it('waitlisted beats full', () => {
    expect(eventButtonState(event, 0, 'waitlisted', before)).toBe('waitlisted')
  })

  it('open_almost_full at 20% of seats or fewer', () => {
    expect(eventButtonState(event, 5, null, before)).toBe('open_almost_full')
  })

  it('open otherwise', () => {
    expect(eventButtonState(event, 20, null, before)).toBe('open')
  })

  it('open when there is no capacity limit', () => {
    expect(eventButtonState({ ...event, capacity: null }, null, null, before)).toBe('open')
  })
})
