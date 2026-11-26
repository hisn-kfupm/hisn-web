import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeatMeter, seatBricks } from '@/components/ui/SeatMeter'
import { LinkButton, Button } from '@/components/ui/Buttons'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { SectionHead } from '@/components/brand/SectionHead'
import { pluralCategory, tp, pickPlural, pluralForms } from '@/lib/i18n/plural'
import { t } from '@/lib/i18n/t'

describe('plural', () => {
  it('follows the Arabic categories', () => {
    expect([0, 1, 2, 3, 10, 11, 99, 100].map((n) => pluralCategory('ar', n))).toEqual(['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other'])
  })
  it('uses zero, one and other in English', () => {
    expect([0, 1, 2, 3, 11, 100].map((n) => pluralCategory('en', n))).toEqual(['zero', 'one', 'other', 'other', 'other', 'other'])
  })
  it('fills {n} in Eastern Arabic digits on Arabic pages', () => {
    expect(tp('ar', 'seats.left', 3)).toContain('٣ مقاعد')
    expect(tp('ar', 'seats.left', 12)).toContain('١٢ مقعدًا')
    expect(tp('ar', 'seats.left', 1)).toContain('مقعد واحد')
  })
  it('picks the English form and fills {n} in Latin digits on English pages', () => {
    expect(tp('en', 'seats.left', 0)).toBe(t('en', 'seats.left.zero', { n: '0' }))
    expect(tp('en', 'seats.left', 1)).toBe(t('en', 'seats.left.one', { n: '1' }))
    expect(tp('en', 'seats.left', 3)).toBe(t('en', 'seats.left.other', { n: '3' }))
    expect(tp('en', 'seats.left', 12)).toContain('12')
  })
  it('lets client components pick a form', () => {
    expect(pickPlural('ar', pluralForms('ar', 'seats.left'), 5)).toContain('٥ مقاعد')
    expect(pickPlural('en', pluralForms('en', 'seats.left'), 5)).toBe(t('en', 'seats.left.other', { n: '5' }))
  })
})

describe('SeatMeter', () => {
  it('fills bricks in proportion, never all ten before full', () => {
    expect(seatBricks(30, 0)).toBe(0)
    expect(seatBricks(30, 1)).toBe(1)
    expect(seatBricks(30, 15)).toBe(5)
    expect(seatBricks(30, 29)).toBe(9)
    expect(seatBricks(30, 30)).toBe(10)
  })
  it('shows ten bricks and the seats left', () => {
    const { container } = render(<SeatMeter locale="ar" capacity={30} taken={24} />)
    expect(container.querySelectorAll('.seat-brick')).toHaveLength(10)
    expect(container.querySelectorAll('.seat-brick[data-on]')).toHaveLength(8)
    expect(container.textContent).toContain('٦ مقاعد')
  })
})

describe('buttons and links', () => {
  it('LinkButton renders a link with the wipe classes', () => {
    render(<LinkButton href="/events" tone="dark">x</LinkButton>)
    const a = screen.getByRole('link')
    expect(a.getAttribute('href')).toBe('/events')
    expect(a.className).toContain('btn-dark-primary')
  })
  it('Button defaults to type=button', () => {
    render(<Button>x</Button>)
    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
  })
  it('ArrowLink hides its arrow from screen readers', () => {
    const { container } = render(<ArrowLink href="/x">x</ArrowLink>)
    expect(container.querySelector('.nudge')?.getAttribute('aria-hidden')).toBe('true')
  })
  it('SectionHead numbers in Eastern Arabic digits', () => {
    const { container } = render(<SectionHead locale="ar" number={2} id="s" title="t" />)
    expect(container.querySelector('[data-testid="section-number"]')?.textContent).toBe('٠٢')
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('s')
  })
})
