import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Header } from '@/components/Header'
import { departments } from '@/lib/data/labels'

describe('Header', () => {
  it('signed out: links to sign-in from the auth entry', () => {
    const { container } = render(<Header session={null} />)
    const entry = container.querySelector('[data-testid="auth-entry"]')
    expect(entry?.querySelector('a[href="/sign-in"]')).not.toBeNull()
  })

  it('signed in: links to the account page and not to sign-in', () => {
    const { container } = render(<Header session={{ email: 'a@b.com' }} />)
    expect(container.querySelector('a[href="/account"]')).not.toBeNull()
    expect(container.querySelector('a[href="/sign-in"]')).toBeNull()
  })

  it('keeps the auth entry outside the mobile menu', () => {
    const { container } = render(<Header session={null} />)
    const entry = container.querySelector('[data-testid="auth-entry"]')
    const menu = container.querySelector('[data-testid="mobile-menu"]')
    expect(entry).not.toBeNull()
    expect(menu).not.toBeNull()
    expect(menu?.contains(entry)).toBe(false)
  })

  it('lists one link per department in the dropdown', () => {
    const { container } = render(<Header session={null} />)
    const links = container.querySelectorAll('[data-testid="dept-menu"] a')
    expect(links.length).toBe(departments.length)
    links.forEach((a) => expect(a.getAttribute('href')).toMatch(/^\/departments\//))
  })
})
