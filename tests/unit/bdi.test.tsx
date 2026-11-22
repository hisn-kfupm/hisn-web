import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Bdi } from '@/components/Bdi'

describe('Bdi', () => {
  it('isolates mixed-direction values', () => {
    const { container } = render(<Bdi>ali@gmail.com</Bdi>)
    expect(container.querySelector('bdi')?.textContent).toBe('ali@gmail.com')
  })
  it('can mark the language of an English value', () => {
    const { container } = render(<Bdi lang="en">Contact@Hisn-sa.org</Bdi>)
    expect(container.querySelector('bdi')?.getAttribute('lang')).toBe('en')
  })
})
