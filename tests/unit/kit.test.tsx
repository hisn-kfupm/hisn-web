import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeatMeter, seatBricks } from '@/components/ui/SeatMeter'
import { LinkButton, Button } from '@/components/ui/Buttons'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { SectionHead } from '@/components/brand/SectionHead'
import { pluralCategory, tp, pickPlural, pluralForms } from '@/lib/i18n/plural'

describe('plural', () => {
  it('follows the Arabic categories', () => {
    expect([0, 1, 2, 3, 10, 11, 99, 100].map(pluralCategory)).toEqual(['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other'])
  })
  it('fills {n} in Eastern Arabic digits', () => {
    expect(tp('seats.left', 3)).toContain('٣ مقاعد')
    expect(tp('seats.left', 12)).toContain('١٢ مقعدًا')
    expect(tp('seats.left', 1)).toContain('مقعد واحد')
  })
  it('lets client components pick a form', () => {
    expect(pickPlural(pluralForms('seats.left'), 5)).toContain('٥ مقاعد')
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
    const { container } = render(<SeatMeter capacity={30} taken={24} />)
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
    const { container } = render(<SectionHead number={2} id="s" title="t" />)
    expect(container.querySelector('[data-testid="section-number"]')?.textContent).toBe('٠٢')
    expect(screen.getByRole('heading', { level: 2 }).id).toBe('s')
  })
})
