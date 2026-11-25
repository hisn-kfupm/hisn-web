import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Bdi } from '@/components/Bdi'
import { Place } from '@/components/Place'

/* dev-1 D1-5: values in the other script are isolated both ways */
describe('Bdi', () => {
  it('isolates mixed-direction values', () => {
    const { container } = render(<Bdi>ali@gmail.com</Bdi>)
    const bdi = container.querySelector('bdi')
    expect(bdi?.textContent).toBe('ali@gmail.com')
    expect(bdi?.hasAttribute('lang')).toBe(false)
    expect(bdi?.hasAttribute('dir')).toBe(false)
  })

  it('marks an Arabic name inside English text as Arabic, right to left', () => {
    const { container } = render(<Bdi lang="ar">علي</Bdi>)
    const bdi = container.querySelector('bdi')
    expect(bdi?.getAttribute('lang')).toBe('ar')
    expect(bdi?.getAttribute('dir')).toBe('rtl')
  })

  it('marks an English value inside Arabic text as English, left to right', () => {
    const { container } = render(<Bdi lang="en">Contact@Hisn-sa.org</Bdi>)
    const bdi = container.querySelector('bdi')
    expect(bdi?.getAttribute('lang')).toBe('en')
    expect(bdi?.getAttribute('dir')).toBe('ltr')
  })
})

/* an event's place or presenter, isolated when it is in the other script */
describe('Place', () => {
  it('on an Arabic page: Arabic reads plain in Eastern digits, Latin is isolated as English', () => {
    expect(render(<Place locale="ar" text="مبنى 58" />).container.innerHTML).toBe('مبنى ٥٨')
    const latin = render(<Place locale="ar" text="Building 58" />).container.querySelector('bdi')
    expect(latin?.getAttribute('lang')).toBe('en')
    expect(latin?.textContent).toBe('Building 58')
  })

  it('on an English page: Latin reads plain, Arabic is isolated as Arabic, right to left', () => {
    expect(render(<Place locale="en" text="Building 58" />).container.innerHTML).toBe('Building 58')
    const arabic = render(<Place locale="en" text="مبنى 58" />).container.querySelector('bdi')
    expect(arabic?.getAttribute('lang')).toBe('ar')
    expect(arabic?.getAttribute('dir')).toBe('rtl')
    expect(arabic?.textContent).toBe('مبنى ٥٨')
  })
})
